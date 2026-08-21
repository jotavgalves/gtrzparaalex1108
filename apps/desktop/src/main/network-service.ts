import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

import {
  IPC_CHANNELS,
  networkStateSchema,
  type NetworkMode,
  type NetworkState,
} from '@gtrz/contracts';

import type { GtrzRequestRouter, RendererRequestDispatcher } from './request-router';

const NETWORK_PORT = 3747;
const NETWORK_PROTOCOL_VERSION = 1;
const MAX_RPC_BODY_BYTES = 25 * 1024 * 1024;
const REMOTE_TIMEOUT_MS = 12_000;
const HEALTH_TIMEOUT_MS = 3_000;
const MAX_IDEMPOTENCY_ENTRIES = 500;

const LOCAL_ONLY_CHANNELS = new Set<string>([
  IPC_CHANNELS.systemGetInfo,
  IPC_CHANNELS.networkGetState,
  IPC_CHANNELS.networkUseLocal,
  IPC_CHANNELS.networkStartHost,
  IPC_CHANNELS.networkConnect,
  IPC_CHANNELS.networkDisconnect,
]);

interface NetworkServiceOptions {
  readonly appVersion: string;
  readonly settingsPath: string;
  readonly router: GtrzRequestRouter;
}

interface PersistedNetworkSettings {
  readonly mode: NetworkMode;
  readonly remoteUrl: string | null;
  readonly clientId: string;
}

interface RpcRequest {
  readonly requestId: string;
  readonly clientId: string;
  readonly channel: string;
  readonly payload?: unknown;
}

type RpcResponse =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha desconhecida na rede local.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function parsePersistedSettings(value: unknown): PersistedNetworkSettings | null {
  if (!isRecord(value)) return null;
  if (value.mode !== 'local' && value.mode !== 'host' && value.mode !== 'client') return null;
  if (value.remoteUrl !== null && typeof value.remoteUrl !== 'string') return null;
  if (typeof value.clientId !== 'string' || value.clientId.length < 8) return null;
  return {
    mode: value.mode,
    remoteUrl: value.remoteUrl,
    clientId: value.clientId,
  };
}

function parseRpcRequest(value: unknown): RpcRequest {
  if (!isRecord(value)) throw new Error('Requisição RPC inválida.');
  if (typeof value.requestId !== 'string' || value.requestId.length < 8) {
    throw new Error('requestId RPC inválido.');
  }
  if (typeof value.clientId !== 'string' || value.clientId.length < 8) {
    throw new Error('clientId RPC inválido.');
  }
  if (typeof value.channel !== 'string' || value.channel.length < 1) {
    throw new Error('Canal RPC inválido.');
  }
  return 'payload' in value
    ? {
        requestId: value.requestId,
        clientId: value.clientId,
        channel: value.channel,
        payload: value.payload,
      }
    : {
        requestId: value.requestId,
        clientId: value.clientId,
        channel: value.channel,
      };
}

function normalizeRemoteUrl(host: string): string {
  const input = host.trim();
  const withProtocol = /^https?:\/\//iu.test(input) ? input : `http://${input}`;
  const url = new URL(withProtocol);

  if (url.protocol !== 'http:') {
    throw new Error('O servidor GTRZ local deve usar HTTP.');
  }

  if (url.port.length === 0) {
    url.port = String(NETWORK_PORT);
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.origin;
}

function listHostAddresses(): readonly string[] {
  const addresses = new Set<string>();

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.add(`http://${entry.address}:${NETWORK_PORT}`);
      }
    }
  }

  return [...addresses].sort();
}

async function readRequestJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_RPC_BODY_BYTES) {
      throw new Error('A requisição excedeu o limite permitido pelo GTRZ.');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};
  return parseJson(Buffer.concat(chunks).toString('utf8'));
}

function writeJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

async function closeServer(server: Server | null): Promise<void> {
  if (server === null || !server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
}

export class NetworkService {
  private readonly appVersion: string;
  private readonly settingsPath: string;
  private readonly router: GtrzRequestRouter;
  private readonly rpcCache = new Map<string, Promise<RpcResponse>>();
  private server: Server | null = null;
  private mode: NetworkMode = 'local';
  private remoteUrl: string | null = null;
  private clientId = randomUUID();
  private connected = true;
  private lastError: string | null = null;

  constructor(options: NetworkServiceOptions) {
    this.appVersion = options.appVersion;
    this.settingsPath = options.settingsPath;
    this.router = options.router;
  }

  readonly invokeFromRenderer: RendererRequestDispatcher = async (
    channel,
    payload,
    dispatchLocal,
  ): Promise<unknown> => {
    if (this.mode !== 'client' || LOCAL_ONLY_CHANNELS.has(channel)) {
      return dispatchLocal();
    }

    return this.invokeRemote(channel, payload);
  };

  async initialize(): Promise<void> {
    const persisted = await this.readSettings();
    this.clientId = persisted.clientId;

    if (persisted.mode === 'host') {
      try {
        await this.startHost();
      } catch (error: unknown) {
        this.mode = 'local';
        this.remoteUrl = null;
        this.connected = true;
        this.lastError = `Servidor não iniciado automaticamente. ${errorMessage(error)}`;
      }
      return;
    }

    if (persisted.mode === 'client' && persisted.remoteUrl !== null) {
      this.mode = 'client';
      this.remoteUrl = persisted.remoteUrl;
      try {
        await this.pingRemote(persisted.remoteUrl);
        this.connected = true;
        this.lastError = null;
      } catch (error: unknown) {
        this.connected = false;
        this.lastError = errorMessage(error);
      }
      return;
    }

    this.mode = 'local';
    this.remoteUrl = null;
    this.connected = true;
    this.lastError = null;
  }

  async getState(): Promise<NetworkState> {
    if (this.mode === 'client' && this.remoteUrl !== null) {
      try {
        await this.pingRemote(this.remoteUrl);
        this.connected = true;
        this.lastError = null;
      } catch (error: unknown) {
        this.connected = false;
        this.lastError = errorMessage(error);
      }
    }

    return this.snapshot();
  }

  async useLocal(): Promise<NetworkState> {
    await closeServer(this.server);
    this.server = null;
    this.mode = 'local';
    this.remoteUrl = null;
    this.connected = true;
    this.lastError = null;
    await this.persistSettings();
    return this.snapshot();
  }

  async startHost(): Promise<NetworkState> {
    await closeServer(this.server);
    this.server = null;
    this.mode = 'local';
    this.remoteUrl = null;
    this.connected = true;
    this.lastError = null;

    const server = createServer((request, response) => {
      void this.handleHttpRequest(request, response);
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = (): void => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(NETWORK_PORT, '0.0.0.0');
      });
    } catch (error: unknown) {
      this.lastError = errorMessage(error);
      throw new Error(`Não foi possível iniciar o servidor GTRZ na porta ${NETWORK_PORT}. ${this.lastError}`);
    }

    this.server = server;
    this.mode = 'host';
    this.connected = true;
    this.lastError = null;
    await this.persistSettings();
    return this.snapshot();
  }

  async connect(host: string): Promise<NetworkState> {
    const remoteUrl = normalizeRemoteUrl(host);
    await this.pingRemote(remoteUrl);
    await closeServer(this.server);
    this.server = null;
    this.mode = 'client';
    this.remoteUrl = remoteUrl;
    this.connected = true;
    this.lastError = null;
    await this.persistSettings();
    return this.snapshot();
  }

  async disconnect(): Promise<NetworkState> {
    return this.useLocal();
  }

  async close(): Promise<void> {
    await closeServer(this.server);
    this.server = null;
  }

  private snapshot(): NetworkState {
    return networkStateSchema.parse({
      mode: this.mode,
      connected: this.connected,
      port: NETWORK_PORT,
      remoteUrl: this.remoteUrl,
      hostAddresses: this.mode === 'host' ? listHostAddresses() : [],
      lastError: this.lastError,
    });
  }

  private async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        writeJson(response, 200, {
          app: 'GTRZ System',
          appVersion: this.appVersion,
          protocolVersion: NETWORK_PROTOCOL_VERSION,
        });
        return;
      }

      if (request.method !== 'POST' || request.url !== '/rpc') {
        writeJson(response, 404, { error: 'Rota não encontrada.' });
        return;
      }

      const rpcRequest = parseRpcRequest(await readRequestJson(request));
      if (LOCAL_ONLY_CHANNELS.has(rpcRequest.channel)) {
        writeJson(response, 403, { ok: false, error: 'Este canal só pode ser usado localmente.' });
        return;
      }

      const rpcResponse = await this.executeIdempotentRpc(rpcRequest);
      writeJson(response, 200, rpcResponse);
    } catch (error: unknown) {
      writeJson(response, 400, { ok: false, error: errorMessage(error) });
    }
  }

  private executeIdempotentRpc(request: RpcRequest): Promise<RpcResponse> {
    const cacheKey = `${request.clientId}:${request.requestId}`;
    const existing = this.rpcCache.get(cacheKey);
    if (existing !== undefined) return existing;

    const execution = this.executeRpc(request);
    this.rpcCache.set(cacheKey, execution);

    if (this.rpcCache.size > MAX_IDEMPOTENCY_ENTRIES) {
      const oldestKey = this.rpcCache.keys().next().value;
      if (typeof oldestKey === 'string') this.rpcCache.delete(oldestKey);
    }

    return execution;
  }

  private async executeRpc(request: RpcRequest): Promise<RpcResponse> {
    try {
      const value = await this.router.dispatch(request.channel, request.payload);
      return { ok: true, value };
    } catch (error: unknown) {
      return { ok: false, error: errorMessage(error) };
    }
  }

  private async invokeRemote(channel: string, payload?: unknown): Promise<unknown> {
    if (this.remoteUrl === null) {
      throw new Error('Este terminal está em modo Cliente, mas nenhum servidor foi configurado.');
    }

    const requestId = randomUUID();
    const body = JSON.stringify({ requestId, clientId: this.clientId, channel, payload });
    let lastFailure: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${this.remoteUrl}/rpc`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
        });
      } catch (error: unknown) {
        lastFailure = error;
        continue;
      }

      let parsed: unknown;
      try {
        parsed = parseJson(await response.text());
      } catch (error: unknown) {
        lastFailure = error;
        continue;
      }

      if (!isRecord(parsed) || typeof parsed.ok !== 'boolean') {
        lastFailure = new Error('O servidor GTRZ retornou uma resposta inválida.');
        continue;
      }

      this.connected = true;
      this.lastError = null;

      if (parsed.ok) return parsed.value;
      if (typeof parsed.error === 'string') throw new Error(parsed.error);
      throw new Error('O servidor GTRZ recusou a operação.');
    }

    this.connected = false;
    this.lastError = errorMessage(lastFailure);
    throw new Error(`Conexão com o servidor GTRZ perdida. ${this.lastError}`);
  }

  private async pingRemote(remoteUrl: string): Promise<void> {
    const response = await fetch(`${remoteUrl}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Servidor respondeu HTTP ${response.status}.`);

    const parsed = parseJson(await response.text());
    if (!isRecord(parsed) || parsed.protocolVersion !== NETWORK_PROTOCOL_VERSION) {
      throw new Error('A versão do protocolo GTRZ é incompatível entre os computadores.');
    }
  }

  private async readSettings(): Promise<PersistedNetworkSettings> {
    try {
      const text = await readFile(this.settingsPath, 'utf8');
      const parsed = parsePersistedSettings(parseJson(text));
      if (parsed !== null) return parsed;
    } catch {
      // Primeira execução ou arquivo inválido: use uma configuração local segura.
    }

    return { mode: 'local', remoteUrl: null, clientId: this.clientId };
  }

  private async persistSettings(): Promise<void> {
    await mkdir(path.dirname(this.settingsPath), { recursive: true });
    await writeFile(
      this.settingsPath,
      JSON.stringify(
        {
          mode: this.mode,
          remoteUrl: this.remoteUrl,
          clientId: this.clientId,
        } satisfies PersistedNetworkSettings,
        null,
        2,
      ),
      'utf8',
    );
  }
}
