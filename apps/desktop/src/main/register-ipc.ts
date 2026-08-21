import { app } from 'electron';

import {
  backupRecordSchema,
  backupStateSchema,
  changeEventStatusInputSchema,
  changeProductionPasswordInputSchema,
  createEventInputSchema,
  deleteEventInputSchema,
  eventDeletionResultSchema,
  eventListSchema,
  eventSchema,
  IPC_CHANNELS,
  operationResultSchema,
  paymentTerminalSettingsSchema,
  renameEventInputSchema,
  restoreBackupResultSchema,
  sessionStateSchema,
  setActiveEventInputSchema,
  switchProfileInputSchema,
  systemInfoSchema,
  updatePaymentTerminalSettingsInputSchema,
  verifyBackupInputSchema,
  type SystemInfo,
} from '@gtrz/contracts';
import {
  changeEventStatus,
  changeProductionPassword,
  createEvent,
  deleteEventPermanently,
  getSessionState,
  listEvents,
  renameEvent,
  setActiveEvent,
  switchProfile,
  type DatabaseContext,
} from '@gtrz/database';
import {
  getPaymentTerminalSettings,
  updatePaymentTerminalSettings,
} from '@gtrz/database/payment-terminal';

import type { BackupService } from './backup-service';
import { registerComboIpcHandlers } from './register-combo-ipc';
import { registerEventCloseIpcHandlers } from './register-event-close-ipc';
import { registerFinanceIpcHandlers } from './register-finance-ipc';
import { registerInsightsIpcHandlers } from './register-insights-ipc';
import { registerInventoryIpcHandlers } from './register-inventory-ipc';
import { registerOperationsIpcHandlers } from './register-operations-ipc';
import { registerPrintingIpcHandlers } from './register-printing-ipc';
import { registerTicketIpcHandlers } from './register-ticket-ipc';
import { registerVoucherIpcHandlers } from './register-voucher-ipc';
import { createIpcRequestRouter, type GtrzRequestRouter } from './request-router';
import { ThermalPrintService } from './thermal-print-service';

interface RegisterIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly databaseReady: () => boolean;
  readonly backupService: BackupService;
}

export function registerIpcHandlers(options: RegisterIpcOptions): GtrzRequestRouter {
  const router = createIpcRequestRouter();
  const printService = new ThermalPrintService({ getDatabase: options.getDatabase });

  router.register(IPC_CHANNELS.systemGetInfo, (): SystemInfo => {
    return systemInfoSchema.parse({
      appName: 'GTRZ System',
      version: app.getVersion(),
      platform: process.platform,
      databaseReady: options.databaseReady(),
    });
  });

  router.register(IPC_CHANNELS.eventsList, () => {
    return eventListSchema.parse(listEvents(options.getDatabase()));
  });

  router.register(IPC_CHANNELS.eventsCreate, (payload: unknown) => {
    const input = createEventInputSchema.parse(payload);
    return eventSchema.parse(createEvent(options.getDatabase(), input));
  });

  router.register(IPC_CHANNELS.eventsRename, (payload: unknown) => {
    const input = renameEventInputSchema.parse(payload);
    return eventSchema.parse(renameEvent(options.getDatabase(), input));
  });

  router.register(IPC_CHANNELS.eventsChangeStatus, (payload: unknown) => {
    const input = changeEventStatusInputSchema.parse(payload);
    const database = options.getDatabase();
    const current = listEvents(database).find((event) => event.id === input.eventId);

    if (current?.status === 'open' && input.status === 'closed') {
      throw new Error(
        'Use o encerramento integrado para conciliar o caixa e gerar o backup final.',
      );
    }

    return eventSchema.parse(changeEventStatus(database, input));
  });

  router.register(IPC_CHANNELS.eventsDelete, (payload: unknown) => {
    const input = deleteEventInputSchema.parse(payload);
    return eventDeletionResultSchema.parse(deleteEventPermanently(options.getDatabase(), input));
  });

  router.register(IPC_CHANNELS.eventsSetActive, (payload: unknown) => {
    const input = setActiveEventInputSchema.parse(payload);
    return sessionStateSchema.parse(setActiveEvent(options.getDatabase(), input.eventId));
  });

  router.register(IPC_CHANNELS.sessionGetState, () => {
    return sessionStateSchema.parse(getSessionState(options.getDatabase()));
  });

  router.register(IPC_CHANNELS.sessionSwitchProfile, (payload: unknown) => {
    const input = switchProfileInputSchema.parse(payload);
    return sessionStateSchema.parse(
      switchProfile(options.getDatabase(), input.targetProfile, input.password),
    );
  });

  router.register(IPC_CHANNELS.settingsChangeProductionPassword, (payload: unknown) => {
    const input = changeProductionPasswordInputSchema.parse(payload);
    changeProductionPassword(options.getDatabase(), input.currentPassword, input.newPassword);
    return operationResultSchema.parse({ success: true });
  });

  router.register(IPC_CHANNELS.settingsGetPaymentTerminal, () => {
    return paymentTerminalSettingsSchema.parse(getPaymentTerminalSettings(options.getDatabase()));
  });

  router.register(IPC_CHANNELS.settingsUpdatePaymentTerminal, (payload: unknown) => {
    const input = updatePaymentTerminalSettingsInputSchema.parse(payload);
    return paymentTerminalSettingsSchema.parse(
      updatePaymentTerminalSettings(options.getDatabase(), input),
    );
  });

  router.register(IPC_CHANNELS.backupsGetState, async () => {
    return backupStateSchema.parse(await options.backupService.getState());
  });

  router.register(IPC_CHANNELS.backupsChooseDestination, async () => {
    return backupStateSchema.parse(await options.backupService.chooseDestination());
  });

  router.register(IPC_CHANNELS.backupsCreateManual, async () => {
    return backupRecordSchema.parse(await options.backupService.createBackup('manual'));
  });

  router.register(IPC_CHANNELS.backupsImport, async () => {
    return restoreBackupResultSchema.parse(await options.backupService.importBackup());
  });

  router.register(IPC_CHANNELS.backupsVerify, async (payload: unknown) => {
    const input = verifyBackupInputSchema.parse(payload);
    return backupRecordSchema.parse(await options.backupService.verify(input.filePath));
  });

  registerInsightsIpcHandlers({ getDatabase: options.getDatabase, router });
  registerInventoryIpcHandlers({ getDatabase: options.getDatabase, router });
  registerComboIpcHandlers({ getDatabase: options.getDatabase, router });
  registerEventCloseIpcHandlers({
    getDatabase: options.getDatabase,
    backupService: options.backupService,
    router,
  });
  registerFinanceIpcHandlers({ getDatabase: options.getDatabase, router });
  registerPrintingIpcHandlers({ printService, router });
  registerOperationsIpcHandlers({
    getDatabase: options.getDatabase,
    printAfterSale: (orderId) => printService.printAfterSale(orderId),
    router,
  });
  registerTicketIpcHandlers({ getDatabase: options.getDatabase, router });
  registerVoucherIpcHandlers({ getDatabase: options.getDatabase, router });

  return router;
}
