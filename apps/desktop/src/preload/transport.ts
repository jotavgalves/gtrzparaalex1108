import { ipcRenderer } from 'electron';

interface GtrzTransport {
  invoke(channel: string, payload?: unknown): Promise<unknown>;
}

const localTransport: GtrzTransport = {
  async invoke(channel: string, payload?: unknown): Promise<unknown> {
    if (payload === undefined) {
      return ipcRenderer.invoke(channel);
    }

    return ipcRenderer.invoke(channel, payload);
  },
};

const activeTransport: GtrzTransport = localTransport;

export async function invoke(channel: string, payload?: unknown): Promise<unknown> {
  return activeTransport.invoke(channel, payload);
}
