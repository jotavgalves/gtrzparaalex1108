import { ipcMain } from 'electron';

export type GtrzRequestHandler = (payload: unknown) => unknown;

export interface GtrzRequestRouter {
  register(channel: string, handler: GtrzRequestHandler): void;
  dispatch(channel: string, payload?: unknown): Promise<unknown>;
}

export function createIpcRequestRouter(): GtrzRequestRouter {
  const handlers = new Map<string, GtrzRequestHandler>();

  return {
    register(channel: string, handler: GtrzRequestHandler): void {
      handlers.set(channel, handler);
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, (_event, payload: unknown) => handler(payload));
    },

    dispatch(channel: string, payload?: unknown): Promise<unknown> {
      const handler = handlers.get(channel);
      if (handler === undefined) {
        return Promise.reject(new Error(`Canal GTRZ não registrado: ${channel}`));
      }

      return Promise.resolve(handler(payload));
    },
  };
}
