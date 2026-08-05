import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  systemInfoSchema,
  type GtrzDesktopApi,
  type SystemInfo,
} from '@gtrz/contracts';

const api: GtrzDesktopApi = {
  system: {
    async getInfo(): Promise<SystemInfo> {
      const payload: unknown = await ipcRenderer.invoke(IPC_CHANNELS.systemGetInfo);
      return systemInfoSchema.parse(payload);
    },
  },
};

contextBridge.exposeInMainWorld('gtrz', api);
