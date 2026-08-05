import { app, ipcMain } from 'electron';

import { IPC_CHANNELS, systemInfoSchema, type SystemInfo } from '@gtrz/contracts';

interface RegisterIpcOptions {
  readonly databaseReady: () => boolean;
}

export function registerIpcHandlers(options: RegisterIpcOptions): void {
  ipcMain.removeHandler(IPC_CHANNELS.systemGetInfo);

  ipcMain.handle(IPC_CHANNELS.systemGetInfo, (): SystemInfo => {
    return systemInfoSchema.parse({
      appName: 'GTRZ System',
      version: app.getVersion(),
      platform: process.platform,
      databaseReady: options.databaseReady(),
    });
  });
}
