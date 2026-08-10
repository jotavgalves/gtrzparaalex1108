import {
  closeCashRegister as closeBaseCashRegister,
  getCashState as getBaseCashState,
  openCashRegister as openBaseCashRegister,
  recordCashMovement as recordBaseCashMovement,
  type DatabaseCashState,
} from './cash';
import { getEventStockCostCents } from './event-stock-cost';
import { calculatePaymentTerminalFees } from './payment-terminal';
import type { DatabaseContext } from './types';

export * from './cash';

export interface DatabaseCashStateWithTerminal extends DatabaseCashState {
  readonly terminalFeesCents: number;
  readonly stockCostCents: number;
}

function applyOperatingCosts(
  database: DatabaseContext,
  state: DatabaseCashState,
): DatabaseCashStateWithTerminal {
  if (state.activeEventId === null) {
    return { ...state, terminalFeesCents: 0, stockCostCents: 0 };
  }

  const fees = calculatePaymentTerminalFees(database, state.activeEventId, {
    debitCardCents: state.salesByMethod.debitCardCents,
    creditCardCents: state.salesByMethod.creditCardCents,
  });
  const stockCostCents = getEventStockCostCents(database, state.activeEventId);

  return {
    ...state,
    terminalFeesCents: fees.totalFeeCents,
    stockCostCents,
    projectedResultCents: state.projectedResultCents - stockCostCents - fees.totalFeeCents,
  };
}

export function getCashState(database: DatabaseContext): DatabaseCashStateWithTerminal {
  return applyOperatingCosts(database, getBaseCashState(database));
}

export function openCashRegister(
  database: DatabaseContext,
  openingCashCents: number,
): DatabaseCashStateWithTerminal {
  return applyOperatingCosts(database, openBaseCashRegister(database, openingCashCents));
}

export function recordCashMovement(
  database: DatabaseContext,
  input: Parameters<typeof recordBaseCashMovement>[1],
): DatabaseCashStateWithTerminal {
  return applyOperatingCosts(database, recordBaseCashMovement(database, input));
}

export function closeCashRegister(
  database: DatabaseContext,
  countedCashCents: number,
): DatabaseCashStateWithTerminal {
  return applyOperatingCosts(database, closeBaseCashRegister(database, countedCashCents));
}
