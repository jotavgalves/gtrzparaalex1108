import {
  closeCashRegister as closeBaseCashRegister,
  getCashState as getBaseCashState,
  openCashRegister as openBaseCashRegister,
  recordCashMovement as recordBaseCashMovement,
  type DatabaseCashState,
} from './cash';
import { calculatePaymentTerminalFees } from './payment-terminal';
import type { DatabaseContext } from './types';

export * from './cash';

export interface DatabaseCashStateWithTerminal extends DatabaseCashState {
  readonly terminalFeesCents: number;
}

function applyTerminalFees(
  database: DatabaseContext,
  state: DatabaseCashState,
): DatabaseCashStateWithTerminal {
  if (state.activeEventId === null) {
    return { ...state, terminalFeesCents: 0 };
  }

  const fees = calculatePaymentTerminalFees(database, state.activeEventId, {
    debitCardCents: state.salesByMethod.debitCardCents,
    creditCardCents: state.salesByMethod.creditCardCents,
  });

  return {
    ...state,
    terminalFeesCents: fees.totalFeeCents,
    projectedResultCents: state.projectedResultCents - fees.totalFeeCents,
  };
}

export function getCashState(database: DatabaseContext): DatabaseCashStateWithTerminal {
  return applyTerminalFees(database, getBaseCashState(database));
}

export function openCashRegister(
  database: DatabaseContext,
  openingCashCents: number,
): DatabaseCashStateWithTerminal {
  return applyTerminalFees(database, openBaseCashRegister(database, openingCashCents));
}

export function recordCashMovement(
  database: DatabaseContext,
  input: Parameters<typeof recordBaseCashMovement>[1],
): DatabaseCashStateWithTerminal {
  return applyTerminalFees(database, recordBaseCashMovement(database, input));
}

export function closeCashRegister(
  database: DatabaseContext,
  countedCashCents: number,
): DatabaseCashStateWithTerminal {
  return applyTerminalFees(database, closeBaseCashRegister(database, countedCashCents));
}
