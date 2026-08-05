import { app, ipcMain } from 'electron';

import {
  backupRecordSchema,
  backupStateSchema,
  changeEventStatusInputSchema,
  changeProductionPasswordInputSchema,
  createEventInputSchema,
  eventListSchema,
  eventSchema,
  IPC_CHANNELS,
  operationResultSchema,
  renameEventInputSchema,
  restoreBackupResultSchema,
  sessionStateSchema,
  setActiveEventInputSchema,
  switchProfileInputSchema,
  systemInfoSchema,
  verifyBackupInputSchema,
  type SystemInfo,
} from '@gtrz/contracts';
import {
  changeEventStatus,
  changeProductionPassword,
  createEvent,
  getSessionState,
  listEvents,
  renameEvent,
  setActiveEvent,
  switchProfile,
  type DatabaseContext,
} from '@gtrz/database';

import type { BackupService } from './backup-service';

interface RegisterIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly databaseReady: () => boolean;
  readonly backupService: BackupService;
}

const CONTROL_CHANNELS = [
  IPC_CHANNELS.systemGetInfo,
  IPC_CHANNELS.eventsList,
  IPC_CHANNELS.eventsCreate,
  IPC_CHANNELS.eventsRename,
  IPC_CHANNELS.eventsChangeStatus,
  IPC_CHANNELS.eventsSetActive,
  IPC_CHANNELS.sessionGetState,
  IPC_CHANNELS.sessionSwitchProfile,
  IPC_CHANNELS.settingsChangeProductionPassword,
  IPC_CHANNELS.backupsGetState,
  IPC_CHANNELS.backupsChooseDestination,
  IPC_CHANNELS.backupsCreateManual,
  IPC_CHANNELS.backupsImport,
  IPC_CHANNELS.backupsVerify,
] as const;

export function registerIpcHandlers(options: RegisterIpcOptions): void {
  for (const channel of CONTROL_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(IPC_CHANNELS.systemGetInfo, (): SystemInfo => {
    return systemInfoSchema.parse({
      appName: 'GTRZ System',
      version: app.getVersion(),
      platform: process.platform,
      databaseReady: options.databaseReady(),
    });
  });

  ipcMain.handle(IPC_CHANNELS.eventsList, () => {
    return eventListSchema.parse(listEvents(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.eventsCreate, (_event, payload: unknown) => {
    const input = createEventInputSchema.parse(payload);
    return eventSchema.parse(createEvent(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.eventsRename, (_event, payload: unknown) => {
    const input = renameEventInputSchema.parse(payload);
    return eventSchema.parse(renameEvent(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.eventsChangeStatus, async (_event, payload: unknown) => {
    const input = changeEventStatusInputSchema.parse(payload);
    const updatedEvent = changeEventStatus(options.getDatabase(), input);

    if (input.status === 'closed') {
      try {
        await options.backupService.createBackup('event-close');
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Falha desconhecida ao gerar o backup.';
        throw new Error(`O evento foi encerrado, mas o backup automático falhou: ${message}`);
      }
    }

    return eventSchema.parse(updatedEvent);
  });

  ipcMain.handle(IPC_CHANNELS.eventsSetActive, (_event, payload: unknown) => {
    const input = setActiveEventInputSchema.parse(payload);
    return sessionStateSchema.parse(setActiveEvent(options.getDatabase(), input.eventId));
  });

  ipcMain.handle(IPC_CHANNELS.sessionGetState, () => {
    return sessionStateSchema.parse(getSessionState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.sessionSwitchProfile, (_event, payload: unknown) => {
    const input = switchProfileInputSchema.parse(payload);
    return sessionStateSchema.parse(
      switchProfile(options.getDatabase(), input.targetProfile, input.password),
    );
  });

  ipcMain.handle(IPC_CHANNELS.settingsChangeProductionPassword, (_event, payload: unknown) => {
    const input = changeProductionPasswordInputSchema.parse(payload);
    changeProductionPassword(options.getDatabase(), input.currentPassword, input.newPassword);
    return operationResultSchema.parse({ success: true });
  });

  ipcMain.handle(IPC_CHANNELS.backupsGetState, async () => {
    return backupStateSchema.parse(await options.backupService.getState());
  });

  ipcMain.handle(IPC_CHANNELS.backupsChooseDestination, async () => {
    return backupStateSchema.parse(await options.backupService.chooseDestination());
  });

  ipcMain.handle(IPC_CHANNELS.backupsCreateManual, async () => {
    return backupRecordSchema.parse(await options.backupService.createBackup('manual'));
  });

  ipcMain.handle(IPC_CHANNELS.backupsImport, async () => {
    return restoreBackupResultSchema.parse(await options.backupService.importBackup());
  });

  ipcMain.handle(IPC_CHANNELS.backupsVerify, async (_event, payload: unknown) => {
    const input = verifyBackupInputSchema.parse(payload);
    return backupRecordSchema.parse(await options.backupService.verify(input.filePath));
  });
}
