import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  addOrderItem,
  closeOrder,
  createEvent,
  createInventoryProduct,
  createProductCategory,
  createServicePoint,
  getCashState,
  openDatabase,
  openOrder,
  recordStockMovement,
  type DatabaseContext,
} from './index';
import { getDashboardStateWithTerminal } from './dashboard-terminal';
import { updatePaymentTerminalSettings } from './payment-terminal';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-terminal-finance-'));
  return openDatabase(path.join(temporaryDirectory, 'terminal-finance.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('payment terminal fees in finance', () => {
  it('desconta taxas do resultado sem alterar faturamento bruto ou caixa físico', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento taxas', startsAt: Date.now() });
    updatePaymentTerminalSettings(database, {
      debitRateBasisPoints: 200,
      creditRateBasisPoints: 300,
    });

    const category = createProductCategory(database, 'Produtos taxas');
    const product = createInventoryProduct(database, {
      categoryId: category.id,
      name: 'Produto taxas',
      kind: 'drink',
      costCents: 100,
      salePriceCents: 1000,
      lowStockThreshold: 1,
    });
    recordStockMovement(database, { productId: product.id, type: 'purchase', quantity: 10 });
    const table = createServicePoint(database, { label: 'Mesa taxas', type: 'table' });

    const creditOrder = openOrder(database, table.id);
    addOrderItem(database, {
      orderId: creditOrder.id,
      itemKind: 'product',
      itemId: product.id,
      quantity: 1,
    });
    closeOrder(database, {
      orderId: creditOrder.id,
      discountCents: 0,
      payments: [{ method: 'credit-card', amountCents: 1000 }],
    });

    const debitOrder = openOrder(database, table.id);
    addOrderItem(database, {
      orderId: debitOrder.id,
      itemKind: 'product',
      itemId: product.id,
      quantity: 2,
    });
    closeOrder(database, {
      orderId: debitOrder.id,
      discountCents: 0,
      payments: [{ method: 'debit-card', amountCents: 2000 }],
    });

    const cash = getCashState(database);
    expect(cash.grossSalesCents).toBe(3000);
    expect(cash.terminalFeesCents).toBe(70);
    expect(cash.projectedResultCents).toBe(2930);
    expect(cash.expectedCashCents).toBe(0);

    const dashboard = getDashboardStateWithTerminal(database);
    expect(dashboard.grossSalesCents).toBe(3000);
    expect(dashboard.projectedResultCents).toBe(2930);
    database.close();
  });
});
