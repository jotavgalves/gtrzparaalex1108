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
  updateExpenseInputSchema,
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
  updateExpense,
  updateExpensePaymentStatus,
  type DatabaseContext,
} from '@gtrz/database';

import type { GtrzRequestRouter } from './request-router';

interface RegisterFinanceIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerFinanceIpcHandlers(options: RegisterFinanceIpcOptions): void {
  options.router.register(IPC_CHANNELS.cashGetState, () => {
    return cashStateSchema.parse(getCashState(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.cashOpen, (payload: unknown) => {
    const input = openCashRegisterInputSchema.parse(payload);
    return cashStateSchema.parse(openCashRegister(options.getDatabase(), input.openingCashCents));
  });

  options.router.register(IPC_CHANNELS.cashRecordMovement, (payload: unknown) => {
    const input = recordCashMovementInputSchema.parse(payload);
    const databaseInput =
      input.note === undefined
        ? { type: input.type, amountCents: input.amountCents }
        : { type: input.type, amountCents: input.amountCents, note: input.note };
    return cashStateSchema.parse(recordCashMovement(options.getDatabase(), databaseInput));
  });

  options.router.register(IPC_CHANNELS.cashClose, (payload: unknown) => {
    const input = closeCashRegisterInputSchema.parse(payload);
    return cashStateSchema.parse(closeCashRegister(options.getDatabase(), input.countedCashCents));
  });

  options.router.register(IPC_CHANNELS.expensesGetState, () => {
    return expenseStateSchema.parse(getExpenseState(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.expensesCreate, (payload: unknown) => {
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

  options.router.register(IPC_CHANNELS.expensesUpdate, (payload: unknown) => {
    const input = updateExpenseInputSchema.parse(payload);
    return expenseSchema.parse(
      updateExpense(options.getDatabase(), {
        expenseId: input.expenseId,
        category: input.category,
        description: input.description,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        ...(input.note === undefined ? {} : { note: input.note }),
      }),
    );
  });

  options.router.register(IPC_CHANNELS.expensesUpdatePaymentStatus, (payload: unknown) => {
    const input = updateExpensePaymentStatusInputSchema.parse(payload);
    return expenseSchema.parse(updateExpensePaymentStatus(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.expensesCancel, (payload: unknown) => {
    const input = cancelExpenseInputSchema.parse(payload);
    return expenseSchema.parse(cancelExpense(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.expensesDelete, (payload: unknown) => {
    const input = deleteExpenseInputSchema.parse(payload);
    return expenseDeletionResultSchema.parse(deleteExpense(options.getDatabase(), input));
  });
}
