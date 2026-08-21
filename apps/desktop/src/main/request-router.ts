import { ipcMain } from 'electron';

type GtrzRequestHandler = (payload: unknown) => unknown;

export type RendererRequestDispatcher = (
  channel: string,
  payload: unknown,
  dispatchLocal: () => Promise<unknown>,
) => Promise<unknown>;

export interface GtrzRequestRouter {
  register(channel: string, handler: GtrzRequestHandler): void;
  dispatch(channel: string, payload?: unknown): Promise<unknown>;
  setRendererDispatcher(dispatcher: RendererRequestDispatcher | null): void;
}

export function createIpcRequestRouter(): GtrzRequestRouter {
  const handlers = new Map<string, GtrzRequestHandler>();
  let rendererDispatcher: RendererRequestDispatcher | null = null;

  return {
    register(channel: string, handler: GtrzRequestHandler): void {
      handlers.set(channel, handler);
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, (_event, payload: unknown) => {
        const dispatchLocal = (): Promise<unknown> => Promise.resolve(handler(payload));
        return rendererDispatcher === null
          ? dispatchLocal()
          : rendererDispatcher(channel, payload, dispatchLocal);
      });
    },

    dispatch(channel: string, payload?: unknown): Promise<unknown> {
      const handler = handlers.get(channel);
      if (handler === undefined) {
        return Promise.reject(new Error(`Canal GTRZ não registrado: ${channel}`));
      }

      return Promise.resolve(handler(payload));
    },

    setRendererDispatcher(dispatcher: RendererRequestDispatcher | null): void {
      rendererDispatcher = dispatcher;
    },
  };
}
