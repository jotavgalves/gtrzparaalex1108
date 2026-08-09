import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  addOrderItem,
  bindOrderVoucher,
  cancelOrder,
  closeOrder,
  createEvent,
  createInventoryProduct,
  createProductCategory,
  createServicePoint,
  getOrder,
  openDatabase,
  openOrder,
  recordStockMovement,
  unbindOrderVoucher,
  type DatabaseContext,
} from './index';
import { createManagedVoucher } from './voucher-management';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-order-voucher-'));
  return openDatabase(path.join(temporaryDirectory, 'order-voucher.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

function seedOrder(
  database: DatabaseContext,
  tableLabel: string,
): { readonly orderId: string; readonly tableId: string } {
  const category = createProductCategory(database, `Bebidas ${tableLabel}`);
  const product = createInventoryProduct(database, {
    categoryId: category.id,
    name: `Água ${tableLabel}`,
    kind: 'drink',
    costCents: 100,
    salePriceCents: 1000,
    lowStockThreshold: 1,
  });
  recordStockMovement(database, { productId: product.id, type: 'purchase', quantity: 5 });
  const table = createServicePoint(database, { label: tableLabel, type: 'table' });
  const order = openOrder(database, table.id);
  const orderId = addOrderItem(database, {
    orderId: order.id,
    itemKind: 'product',
    itemId: product.id,
    quantity: 1,
  }).id;
  return { orderId, tableId: table.id };
}

describe('voucher vinculado à comanda', () => {
  it('aceita somente a mesa original e o código manual não burla o vínculo', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento vínculo', startsAt: Date.now() });
    const first = seedOrder(database, 'Mesa A');
    const second = seedOrder(database, 'Mesa B');
    const voucher = createManagedVoucher(database, {
      code: 'VCH-MESA',
      label: 'Crédito mesa',
      initialBalanceCents: 1500,
      servicePointId: first.tableId,
    });

    bindOrderVoucher(database, { orderId: first.orderId, code: voucher.code });
    expect(getOrder(database, first.orderId).voucherAllocation).toMatchObject({
      code: voucher.code,
      label: 'Crédito mesa',
      remainingBalanceCents: 1500,
    });
    expect(() =>
      bindOrderVoucher(database, { orderId: second.orderId, code: voucher.code }),
    ).toThrow('O voucher só pode ser utilizado em Mesa A, não em Mesa B.');

    unbindOrderVoucher(database, first.orderId);
    expect(getOrder(database, first.orderId).voucherAllocation).toBeNull();
    expect(() =>
      bindOrderVoucher(database, { orderId: second.orderId, code: voucher.code }),
    ).toThrow('O voucher só pode ser utilizado em Mesa A, não em Mesa B.');
    database.close();
  });

  it('formata saldo em reais, consome somente no fechamento e libera ao cancelar', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento saldo', startsAt: Date.now() });
    const seeded = seedOrder(database, 'Mesa saldo');
    const voucher = createManagedVoucher(database, {
      code: 'VCH-SALDO',
      label: 'Crédito limitado',
      initialBalanceCents: 400,
      servicePointId: seeded.tableId,
    });

    bindOrderVoucher(database, { orderId: seeded.orderId, code: voucher.code });
    expect(() =>
      closeOrder(database, {
        orderId: seeded.orderId,
        discountCents: 0,
        payments: [{ method: 'cash', amountCents: 500, receivedCents: 1000 }],
        voucherUses: [{ code: voucher.code, amountCents: 500 }],
      }),
    ).toThrow(/Disponível: R\$\s4,00\./u);
    expect(getOrder(database, seeded.orderId)).toMatchObject({
      status: 'open',
      voucherAllocation: { remainingBalanceCents: 400 },
    });

    const paid = closeOrder(database, {
      orderId: seeded.orderId,
      discountCents: 0,
      payments: [{ method: 'cash', amountCents: 600, receivedCents: 1000 }],
      voucherUses: [{ code: voucher.code, amountCents: 400 }],
    });
    expect(paid.voucherAllocation).toBeNull();
    expect(paid.payments[0]).toMatchObject({ changeCents: 400 });

    cancelOrder(database, {
      orderId: seeded.orderId,
      reason: 'Estorno para validar restituição',
    });
    const balance = database.sqlite
      .prepare('SELECT remaining_balance_cents FROM vouchers WHERE id = ?')
      .get(voucher.id);
    expect(balance).toEqual({ remaining_balance_cents: 400 });
    database.close();
  });
});
