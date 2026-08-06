import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  addOrderItem,
  bindOrderVoucher,
  cancelOrder,
  changeVoucherStatus,
  closeOrder,
  createEvent,
  createInventoryProduct,
  createProductCategory,
  createVoucher,
  getOperationState,
  getOrder,
  getVoucherState,
  openDatabase,
  openOrder,
  recordStockMovement,
  switchProfile,
  type DatabaseContext,
} from './index';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-vouchers-'));
  return openDatabase(path.join(temporaryDirectory, 'vouchers.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

function seedProduct(database: DatabaseContext): string {
  const category = createProductCategory(database, 'Voucher teste');
  const product = createInventoryProduct(database, {
    categoryId: category.id,
    name: 'Produto voucher',
    kind: 'drink',
    costCents: 200,
    salePriceCents: 1000,
    lowStockThreshold: 1,
  });
  recordStockMovement(database, { productId: product.id, type: 'purchase', quantity: 5 });
  return product.id;
}

function openProductOrder(database: DatabaseContext, productId: string): string {
  const counter = getOperationState(database).servicePoints[0];

  if (counter === undefined) {
    throw new Error('Balcão não criado.');
  }

  const order = openOrder(database, counter.id);
  return addOrderItem(database, {
    orderId: order.id,
    itemKind: 'product',
    itemId: productId,
    quantity: 1,
  }).id;
}

function getStock(database: DatabaseContext, eventId: string, productId: string): number {
  const row = database.sqlite
    .prepare('SELECT quantity FROM event_stock WHERE event_id = ? AND product_id = ?')
    .get(eventId, productId) as { readonly quantity: number } | undefined;
  return row?.quantity ?? 0;
}

describe('vouchers database', () => {
  it('emite voucher com código normalizado e razão inicial', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento voucher', startsAt: Date.now() });
    const voucher = createVoucher(database, {
      code: 'vip 001',
      label: 'Crédito VIP',
      initialBalanceCents: 5000,
    });

    expect(voucher).toMatchObject({
      code: 'VIP-001',
      label: 'Crédito VIP',
      initialBalanceCents: 5000,
      remainingBalanceCents: 5000,
      status: 'active',
    });
    expect(getVoucherState(database).transactions[0]).toMatchObject({
      voucherId: voucher.id,
      type: 'issue',
      amountCents: 5000,
      balanceBeforeCents: 0,
      balanceAfterCents: 5000,
    });
    database.close();
  });

  it('combina voucher parcial e dinheiro na mesma venda', async () => {
    const database = await createTemporaryDatabase();
    const event = createEvent(database, { name: 'Evento misto', startsAt: Date.now() });
    const productId = seedProduct(database);
    const voucher = createVoucher(database, {
      code: 'MISTO-01',
      label: 'Crédito parcial',
      initialBalanceCents: 700,
    });
    const orderId = openProductOrder(database, productId);
    bindOrderVoucher(database, { orderId, code: voucher.code });
    const paidOrder = closeOrder(database, {
      orderId,
      discountCents: 0,
      payments: [{ method: 'cash', amountCents: 600, receivedCents: 1000 }],
      voucherUses: [{ code: voucher.code, amountCents: 400 }],
    });

    expect(paidOrder).toMatchObject({
      status: 'paid',
      totalCents: 1000,
      paidCents: 1000,
      remainingCents: 0,
    });
    expect(paidOrder.voucherRedemptions).toEqual([
      { voucherId: voucher.id, code: voucher.code, amountCents: 400 },
    ]);
    expect(paidOrder.payments[0]).toMatchObject({ amountCents: 600, changeCents: 400 });
    expect(getVoucherState(database).vouchers[0]?.remainingBalanceCents).toBe(300);
    expect(getStock(database, event.id, productId)).toBe(4);
    database.close();
  });

  it('restitui exatamente o saldo usado quando a venda é estornada', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento restituição', startsAt: Date.now() });
    const productId = seedProduct(database);
    const voucher = createVoucher(database, {
      code: 'REFUND-01',
      label: 'Crédito restituível',
      initialBalanceCents: 1000,
    });
    const orderId = openProductOrder(database, productId);
    bindOrderVoucher(database, { orderId, code: voucher.code });
    closeOrder(database, {
      orderId,
      discountCents: 0,
      payments: [],
      voucherUses: [{ code: voucher.code, amountCents: 1000 }],
    });
    expect(getVoucherState(database).vouchers[0]).toMatchObject({
      remainingBalanceCents: 0,
      status: 'exhausted',
    });

    cancelOrder(database, { orderId, reason: 'Venda duplicada' });
    expect(getVoucherState(database).vouchers[0]).toMatchObject({
      remainingBalanceCents: 1000,
      status: 'active',
    });
    expect(
      getVoucherState(database).transactions.filter((transaction) => transaction.type === 'refund'),
    ).toHaveLength(1);
    database.close();
  });

  it('faz rollback de estoque e comanda quando o voucher não possui saldo', async () => {
    const database = await createTemporaryDatabase();
    const event = createEvent(database, { name: 'Evento rollback voucher', startsAt: Date.now() });
    const productId = seedProduct(database);
    const voucher = createVoucher(database, {
      code: 'CURTO-01',
      label: 'Saldo curto',
      initialBalanceCents: 200,
    });
    const orderId = openProductOrder(database, productId);
    bindOrderVoucher(database, { orderId, code: voucher.code });

    expect(() =>
      closeOrder(database, {
        orderId,
        discountCents: 0,
        payments: [{ method: 'pix', amountCents: 700 }],
        voucherUses: [{ code: voucher.code, amountCents: 300 }],
      }),
    ).toThrow(/Saldo insuficiente no voucher CURTO-01\. Disponível: R\$\s2,00\./u);
    expect(getOrder(database, orderId)).toMatchObject({ status: 'open', paidCents: 0 });
    expect(getStock(database, event.id, productId)).toBe(5);
    expect(getVoucherState(database).vouchers[0]?.remainingBalanceCents).toBe(200);
    expect(database.sqlite.prepare('SELECT COUNT(*) AS value FROM payments').get()).toEqual({
      value: 0,
    });
    database.close();
  });

  it('preserva saldo ao cancelar e reativar e bloqueia administração no Caixa', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento estado voucher', startsAt: Date.now() });
    const voucher = createVoucher(database, {
      label: 'Voucher controlado',
      initialBalanceCents: 1500,
    });

    expect(
      changeVoucherStatus(database, { voucherId: voucher.id, status: 'cancelled' }),
    ).toMatchObject({
      status: 'cancelled',
      remainingBalanceCents: 1500,
    });
    expect(changeVoucherStatus(database, { voucherId: voucher.id, status: 'active' }).status).toBe(
      'active',
    );
    switchProfile(database, 'cashier');
    expect(() => createVoucher(database, { label: 'Proibido', initialBalanceCents: 100 })).toThrow(
      'A administração de vouchers exige o perfil Produção.',
    );
    expect(() =>
      changeVoucherStatus(database, { voucherId: voucher.id, status: 'cancelled' }),
    ).toThrow('A administração de vouchers exige o perfil Produção.');
    database.close();
  });
});
