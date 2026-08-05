import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';

import { openDatabase, type DatabaseContext, verifyDatabaseIntegrity } from '@gtrz/database';

import { createMainWindow } from './create-main-window';
import { registerIpcHandlers } from './register-ipc';

let mainWindow: BrowserWindow | null = null;
let database: DatabaseContext | null = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow === null) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    try {
      const databasePath = path.join(app.getPath('userData'), 'gtrz-system.sqlite');
      database = openDatabase(databasePath);

      if (!verifyDatabaseIntegrity(database)) {
        throw new Error('A verificação de integridade do banco local falhou.');
      }

      registerIpcHandlers({
        databaseReady: () => database?.sqlite.open ?? false,
      });

      mainWindow = createMainWindow();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Falha desconhecida na inicialização.';
      dialog.showErrorBox('GTRZ System não pôde iniciar', message);
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });

  app.on('before-quit', () => {
    database?.close();
    database = null;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
