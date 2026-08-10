import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createEvent,
  createInventoryProduct,
  createProductCategory,
  createServicePoint,
  getOperationState,
  openDatabase,
  recordStockMovement,
  startOrderWithItem,
  type DatabaseContext,
} from './index';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-lazy-order-'));
  return openDatabase(path.join(temporaryDirectory, 'lazy-order.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

function seed(database: DatabaseContext): { readonly tableId: string; readonly productId: string } {
  createEvent(database, { name: 'Evento comanda preguiçosa', startsAt: Date.now() });
  const category = createProductCategory(database, 'Bebidas lazy');
  const product = createInventoryProduct(database, {
    categoryId: category.id,
    name: 'Água lazy',
    kind: 'drink',
    costCents: 100,
    salePriceCents: 500,
    lowStockThreshold: 1,
  });
  recordStockMovement(database, { productId: product.id, type: 'purchase', quantity: 3 });
  const table = createServicePoint(database, { label: 'Mesa lazy', type: 'table' });
  return { tableId: table.id, productId: product.id };
}

function countOrders(database: DatabaseContext): number {
  const row = database.sqlite.prepare('SELECT COUNT(*) AS value FROM orders').get() as {
    readonly value: number;
  };
  return row.value;
}

describe('lazy order creation', () => {
  it('cria a comanda somente junto com o primeiro item', async () => {
    const database = await createTemporaryDatabase();
    const seeded = seed(database);

    expect(countOrders(database)).toBe(0);
    expect(
      getOperationState(database).servicePoints.find((point) => point.id === seeded.tableId),
    ).toMatchObject({ status: 'available', activeOrderId: null });

    const order = startOrderWithItem(database, {
      servicePointId: seeded.tableId,
      itemKind: 'product',
      itemId: seeded.productId,
      quantity: 1,
    });

    expect(order).toMatchObject({ status: 'open', subtotalCents: 500, totalCents: 500 });
    expect(order.items).toHaveLength(1);
    expect(countOrders(database)).toBe(1);
    expect(
      getOperationState(database).servicePoints.find((point) => point.id === seeded.tableId),
    ).toMatchObject({ status: 'open', activeOrderId: order.id });
    database.close();
  });

  it('reverte também a comanda se o primeiro item falhar', async () => {
    const database = await createTemporaryDatabase();
    const seeded = seed(database);

    expect(() =>
      startOrderWithItem(database, {
        servicePointId: seeded.tableId,
        itemKind: 'product',
        itemId: seeded.productId,
        quantity: 4,
      }),
    ).toThrow('Estoque insuficiente para Água lazy. Disponível: 3.');

    expect(countOrders(database)).toBe(0);
    expect(
      getOperationState(database).servicePoints.find((point) => point.id === seeded.tableId),
    ).toMatchObject({ status: 'available', activeOrderId: null });
    database.close();
  });
});
