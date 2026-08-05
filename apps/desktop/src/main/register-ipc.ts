import { app, ipcMain } from 'electron';

import {
  changeEventStatusInputSchema,
  changeProductionPasswordInputSchema,
  createEventInputSchema,
  eventListSchema,
  eventSchema,
  IPC_CHANNELS,
  operationResultSchema,
  renameEventInputSchema,
  sessionStateSchema,
  setActiveEventInputSchema,
  switchProfileInputSchema,
  systemInfoSchema,
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

interface RegisterIpcOptions {
  readonly database: DatabaseContext;
  readonly databaseReady: () => boolean;
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
    return eventListSchema.parse(listEvents(options.database));
  });

  ipcMain.handle(IPC_CHANNELS.eventsCreate, (_event, payload: unknown) => {
    const input = createEventInputSchema.parse(payload);
    return eventSchema.parse(createEvent(options.database, input));
  });

  ipcMain.handle(IPC_CHANNELS.eventsRename, (_event, payload: unknown) => {
    const input = renameEventInputSchema.parse(payload);
    return eventSchema.parse(renameEvent(options.database, input));
  });

  ipcMain.handle(IPC_CHANNELS.eventsChangeStatus, (_event, payload: unknown) => {
    const input = changeEventStatusInputSchema.parse(payload);
    return eventSchema.parse(changeEventStatus(options.database, input));
  });

  ipcMain.handle(IPC_CHANNELS.eventsSetActive, (_event, payload: unknown) => {
    const input = setActiveEventInputSchema.parse(payload);
    return sessionStateSchema.parse(setActiveEvent(options.database, input.eventId));
  });

  ipcMain.handle(IPC_CHANNELS.sessionGetState, () => {
    return sessionStateSchema.parse(getSessionState(options.database));
  });

  ipcMain.handle(IPC_CHANNELS.sessionSwitchProfile, (_event, payload: unknown) => {
    const input = switchProfileInputSchema.parse(payload);
    return sessionStateSchema.parse(
      switchProfile(options.database, input.targetProfile, input.password),
    );
  });

  ipcMain.handle(IPC_CHANNELS.settingsChangeProductionPassword, (_event, payload: unknown) => {
    const input = changeProductionPasswordInputSchema.parse(payload);
    changeProductionPassword(options.database, input.currentPassword, input.newPassword);
    return operationResultSchema.parse({ success: true });
  });
}
