import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { NetworkService } from '../../apps/desktop/src/main/network-service';
import type { GtrzRequestRouter } from '../../apps/desktop/src/main/request-router';

let temporaryDirectory: string | null = null;
const services: NetworkService[] = [];

function createRouter(
  handler: (channel: string, payload?: unknown) => unknown,
): GtrzRequestRouter {
  return {
    register(channel, requestHandler): void {
      void channel;
      void requestHandler;
    },
    dispatch(channel: string, payload?: unknown): Promise<unknown> {
      return Promise.resolve(handler(channel, payload));
    },
    setRendererDispatcher(dispatcher): void {
      void dispatcher;
    },
  };
}

async function createSettingsPath(name: string): Promise<string> {
  temporaryDirectory ??= await mkdtemp(path.join(tmpdir(), 'gtrz-network-'));
  return path.join(temporaryDirectory, `${name}.json`);
}

function track(service: NetworkService): NetworkService {
  services.push(service);
  return service;
}

afterEach(async () => {
  while (services.length > 0) {
    await services.pop()?.close();
  }

  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('NetworkService Host/Cliente', () => {
  it('encaminha a chamada do Cliente ao roteador do Host sem usar o fallback local', async () => {
    const hostRouter = createRouter((channel, payload) => ({ channel, payload, source: 'host' }));
    const clientRouter = createRouter(() => 'local');
    const host = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: await createSettingsPath('host'),
        router: hostRouter,
      }),
    );
    const client = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: await createSettingsPath('client'),
        router: clientRouter,
      }),
    );

    await host.startHost();
    const connected = await client.connect('127.0.0.1:3747');
    const localFallback = vi.fn<() => Promise<unknown>>(() => Promise.resolve('local'));

    const result = await client.invokeFromRenderer(
      'test:echo',
      { saleId: 'sale-1' },
      localFallback,
    );

    expect(connected.mode).toBe('client');
    expect(connected.connected).toBe(true);
    expect(result).toEqual({
      channel: 'test:echo',
      payload: { saleId: 'sale-1' },
      source: 'host',
    });
    expect(localFallback).not.toHaveBeenCalled();
  });

  it('não repete erro de negócio devolvido pelo Host', async () => {
    let calls = 0;
    const hostRouter = createRouter(() => {
      calls += 1;
      throw new Error('Operação recusada pelo Host.');
    });
    const host = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: await createSettingsPath('host'),
        router: hostRouter,
      }),
    );
    const client = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: await createSettingsPath('client'),
        router: createRouter(() => 'local'),
      }),
    );

    await host.startHost();
    await client.connect('127.0.0.1:3747');

    await expect(
      client.invokeFromRenderer('test:reject', {}, () => Promise.resolve('local')),
    ).rejects.toThrow('Operação recusada pelo Host.');
    expect(calls).toBe(1);
  });

  it('restaura o modo Cliente após reinicialização sem cair silenciosamente no banco local', async () => {
    const host = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: await createSettingsPath('host'),
        router: createRouter(() => 'host'),
      }),
    );
    const clientSettingsPath = await createSettingsPath('client');
    const firstClient = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: clientSettingsPath,
        router: createRouter(() => 'local'),
      }),
    );

    await host.startHost();
    await firstClient.connect('127.0.0.1:3747');
    await firstClient.close();

    const restartedClient = track(
      new NetworkService({
        appVersion: 'test',
        settingsPath: clientSettingsPath,
        router: createRouter(() => 'local'),
      }),
    );
    await restartedClient.initialize();

    const state = await restartedClient.getState();
    expect(state.mode).toBe('client');
    expect(state.connected).toBe(true);
    expect(state.remoteUrl).toBe('http://127.0.0.1:3747');
  });
});
