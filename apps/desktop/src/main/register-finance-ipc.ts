import { ipcMain } from 'electron';

import {
  cancelExpenseInputSchema,
  cashStateSchema,
  closeCashRegisterInputSchema,
  createExpenseInputSchema,
  deleteExpenseInputSchema,
  expenseDeletionResultSchema,
  expenseSchema,
  expenseStateSchema,
  IPC_CHANNELS,
  openCashRegisterInputSchema,
  recordCashMovementInputSchema,
  updateExpensePaymentStatusInputSchema,
} from '@gtrz/contracts';
import {
  cancelExpense,
  closeCashRegister,
  createExpense,
  deleteExpense,
  getCashState,
  getExpenseState,
  openCashRegister,
  recordCashMovement,
  updateExpensePaymentStatus,
  type DatabaseContext,
} from '@gtrz/database';

interface RegisterFinanceIpcOptions {
  readonly getDatabase: () => DatabaseContext;
}

const FINANCE_CHANNELS = [
  IPC_CHANNELS.cashGetState,
  IPC_CHANNELS.cashOpen,
  IPC_CHANNELS.cashRecordMovement,
  IPC_CHANNELS.cashClose,
  IPC_CHANNELS.expensesGetState,
  IPC_CHANNELS.expensesCreate,
  IPC_CHANNELS.expensesUpdatePaymentStatus,
  IPC_CHANNELS.expensesCancel,
  IPC_CHANNELS.expensesDelete,
] as const;

export function registerFinanceIpcHandlers(options: RegisterFinanceIpcOptions): void {
  for (const channel of FINANCE_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(IPC_CHANNELS.cashGetState, () => {
    return cashStateSchema.parse(getCashState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.cashOpen, (_event, payload: unknown) => {
    const input = openCashRegisterInputSchema.parse(payload);
    return cashStateSchema.parse(openCashRegister(options.getDatabase(), input.openingCashCents));
  });

  ipcMain.handle(IPC_CHANNELS.cashRecordMovement, (_event, payload: unknown) => {
    const input = recordCashMovementInputSchema.parse(payload);
    const databaseInput =
      input.note === undefined
        ? { type: input.type, amountCents: input.amountCents }
        : { type: input.type, amountCents: input.amountCents, note: input.note };
    return cashStateSchema.parse(recordCashMovement(options.getDatabase(), databaseInput));
  });

  ipcMain.handle(IPC_CHANNELS.cashClose, (_event, payload: unknown) => {
    const input = closeCashRegisterInputSchema.parse(payload);
    return cashStateSchema.parse(closeCashRegister(options.getDatabase(), input.countedCashCents));
  });

  ipcMain.handle(IPC_CHANNELS.expensesGetState, () => {
    return expenseStateSchema.parse(getExpenseState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.expensesCreate, (_event, payload: unknown) => {
    const input = createExpenseInputSchema.parse(payload);
    return expenseSchema.parse(
      createExpense(options.getDatabase(), {
        category: input.category,
        description: input.description,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
        ...(input.paymentStatus === undefined ? {} : { paymentStatus: input.paymentStatus }),
        ...(input.note === undefined ? {} : { note: input.note }),
      }),
    );
  });

  ipcMain.handle(IPC_CHANNELS.expensesUpdatePaymentStatus, (_event, payload: unknown) => {
    const input = updateExpensePaymentStatusInputSchema.parse(payload);
    return expenseSchema.parse(updateExpensePaymentStatus(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.expensesCancel, (_event, payload: unknown) => {
    const input = cancelExpenseInputSchema.parse(payload);
    return expenseSchema.parse(cancelExpense(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.expensesDelete, (_event, payload: unknown) => {
    const input = deleteExpenseInputSchema.parse(payload);
    return expenseDeletionResultSchema.parse(deleteExpense(options.getDatabase(), input));
  });
}
