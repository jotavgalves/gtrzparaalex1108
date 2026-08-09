import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  addOrderItem,
  bindOrderVoucher,
  closeOrder,
  createEvent,
  createInventoryProduct,
  createProductCategory,
  createServicePoint,
  getOrder,
  openDatabase,
  openOrder,
  recordStockMovement,
  type DatabaseContext,
} from './index';
import {
  addManagedVoucherBalance,
  createManagedVoucher,
  deleteManagedVoucher,
  getManagedVoucherState,
  updateManagedVoucher,
} from './voucher-management';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-voucher-management-'));
  return openDatabase(path.join(temporaryDirectory, 'voucher-management.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

function seedProduct(database: DatabaseContext): string {
  const category = createProductCategory(database, 'Gestão voucher');
  const product = createInventoryProduct(database, {
    categoryId: category.id,
    name: 'Produto gestão voucher',
    kind: 'drink',
    costCents: 200,
    salePriceCents: 1000,
    lowStockThreshold: 1,
  });
  recordStockMovement(database, { productId: product.id, type: 'purchase', quantity: 5 });
  return product.id;
}

function getStock(database: DatabaseContext, eventId: string, productId: string): number {
  const row = database.sqlite
    .prepare('SELECT quantity FROM event_stock WHERE event_id = ? AND product_id = ?')
    .get(eventId, productId) as { readonly quantity: number } | undefined;
  return row?.quantity ?? 0;
}

describe('voucher management', () => {
  it('emite em uma mesa, lista vínculo e permite adicionar saldo', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento gerenciado', startsAt: Date.now() });
    const table = createServicePoint(database, { label: 'Mesa 10', type: 'table' });
    const voucher = createManagedVoucher(database, {
      code: 'MESA-10',
      label: 'Crédito Mesa 10',
      initialBalanceCents: 2000,
      servicePointId: table.id,
    });

    expect(voucher).toMatchObject({
      servicePointId: table.id,
      servicePointLabel: 'Mesa 10',
      servicePointActive: true,
      deletedAt: null,
    });
    expect(getManagedVoucherState(database).servicePoints).toEqual([
      { id: table.id, label: 'Mesa 10' },
    ]);

    const recharged = addManagedVoucherBalance(database, {
      voucherId: voucher.id,
      amountCents: 500,
    });
    expect(recharged).toMatchObject({
      initialBalanceCents: 2500,
      remainingBalanceCents: 2500,
    });
    database.close();
  });

  it('bloqueia troca enquanto a mesa original existe e libera após ela ser inativada', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento troca', startsAt: Date.now() });
    const firstTable = createServicePoint(database, { label: 'Mesa original', type: 'table' });
    const secondTable = createServicePoint(database, { label: 'Mesa nova', type: 'table' });
    const voucher = createManagedVoucher(database, {
      code: 'TROCA-01',
      label: 'Voucher troca',
      initialBalanceCents: 1000,
      servicePointId: firstTable.id,
    });

    expect(() =>
      updateManagedVoucher(database, {
        voucherId: voucher.id,
        code: voucher.code,
        label: voucher.label,
        servicePointId: secondTable.id,
      }),
    ).toThrow('permanece vinculado a Mesa original enquanto essa mesa existir');

    database.sqlite
      .prepare('UPDATE service_points SET active = 0, updated_at = ? WHERE id = ?')
      .run(Date.now(), firstTable.id);

    expect(
      updateManagedVoucher(database, {
        voucherId: voucher.id,
        code: voucher.code,
        label: 'Voucher reassociado',
        servicePointId: secondTable.id,
      }),
    ).toMatchObject({
      servicePointId: secondTable.id,
      servicePointLabel: 'Mesa nova',
      servicePointActive: true,
      label: 'Voucher reassociado',
    });
    database.close();
  });

  it('exclui definitivamente voucher nunca utilizado', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento exclusão simples', startsAt: Date.now() });
    const table = createServicePoint(database, { label: 'Mesa excluir', type: 'table' });
    const voucher = createManagedVoucher(database, {
      code: 'DEL-SEM-USO',
      label: 'Sem uso',
      initialBalanceCents: 1000,
      servicePointId: table.id,
    });

    expect(
      deleteManagedVoucher(database, { voucherId: voucher.id, reason: 'Cadastro errado' }),
    ).toEqual({ mode: 'deleted' });
    expect(
      database.sqlite.prepare('SELECT id FROM vouchers WHERE id = ?').get(voucher.id),
    ).toBeUndefined();
    expect(getManagedVoucherState(database).vouchers).toHaveLength(0);
    database.close();
  });

  it('ao excluir voucher usado estorna a venda, restaura estoque e move para Excluídos', async () => {
    const database = await createTemporaryDatabase();
    const event = createEvent(database, { name: 'Evento exclusão usada', startsAt: Date.now() });
    const table = createServicePoint(database, { label: 'Mesa usada', type: 'table' });
    const productId = seedProduct(database);
    const voucher = createManagedVoucher(database, {
      code: 'DEL-USADO',
      label: 'Voucher usado',
      initialBalanceCents: 1000,
      servicePointId: table.id,
    });
    const order = openOrder(database, table.id);
    const orderId = addOrderItem(database, {
      orderId: order.id,
      itemKind: 'product',
      itemId: productId,
      quantity: 1,
    }).id;
    bindOrderVoucher(database, { orderId, code: voucher.code });
    closeOrder(database, {
      orderId,
      discountCents: 0,
      payments: [],
      voucherUses: [{ code: voucher.code, amountCents: 1000 }],
    });
    expect(getStock(database, event.id, productId)).toBe(4);

    expect(
      deleteManagedVoucher(database, { voucherId: voucher.id, reason: 'Voucher emitido errado' }),
    ).toEqual({ mode: 'reversed-and-hidden' });

    expect(getOrder(database, orderId).status).toBe('cancelled');
    expect(getStock(database, event.id, productId)).toBe(5);
    const state = getManagedVoucherState(database);
    expect(state.vouchers).toHaveLength(0);
    expect(state.deletedVouchers).toHaveLength(1);
    expect(state.deletedVouchers[0]).toMatchObject({
      id: voucher.id,
      status: 'cancelled',
      remainingBalanceCents: 1000,
    });
    database.close();
  });
});
