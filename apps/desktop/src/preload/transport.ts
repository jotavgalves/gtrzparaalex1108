import { ipcRenderer, type IpcRendererEvent } from 'electron';

export type GtrzTransportKind = 'local' | 'remote';

export type GtrzTransportListener = (payload: unknown) => void;

export interface GtrzTransport {
  readonly kind: GtrzTransportKind;
  invoke(channel: string, payload?: unknown): Promise<unknown>;
  subscribe(channel: string, listener: GtrzTransportListener): () => void;
}

function createLocalTransport(): GtrzTransport {
  return {
    kind: 'local',
    async invoke(channel: string, payload?: unknown): Promise<unknown> {
      if (payload === undefined) {
        return ipcRenderer.invoke(channel);
      }

      return ipcRenderer.invoke(channel, payload);
    },
    subscribe(channel: string, listener: GtrzTransportListener): () => void {
      const handler = (_event: IpcRendererEvent, payload: unknown): void => {
        listener(payload);
      };

      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
  };
}

let activeTransport: GtrzTransport = createLocalTransport();

export function getActiveTransportKind(): GtrzTransportKind {
  return activeTransport.kind;
}

export function setActiveTransport(transport: GtrzTransport): void {
  activeTransport = transport;
}

export async function invoke(channel: string, payload?: unknown): Promise<unknown> {
  return activeTransport.invoke(channel, payload);
}

export function subscribe(channel: string, listener: GtrzTransportListener): () => void {
  return activeTransport.subscribe(channel, listener);
}
