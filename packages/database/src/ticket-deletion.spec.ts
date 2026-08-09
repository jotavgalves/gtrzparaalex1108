import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  cancelTicketSale,
  createEvent,
  createTicketLot,
  createTicketSale,
  deleteTicketSale,
  getCashState,
  getTicketState,
  openDatabase,
  switchProfile,
  type DatabaseContext,
} from './index';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-ticket-delete-'));
  return openDatabase(path.join(temporaryDirectory, 'ticket-delete.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('ticket sale deletion', () => {
  it('cancela uma venda ativa antes de excluir e devolve capacidade e receita', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento exclusão ingresso', startsAt: Date.now() });
    const lot = createTicketLot(database, {
      name: 'Lote exclusão',
      priceCents: 5000,
      capacity: 5,
    });
    const sale = createTicketSale(database, {
      lotId: lot.id,
      attendeeName: 'Venda errada',
      source: 'door',
      quantity: 2,
      paymentMethod: 'pix',
      manualCodes: ['DEL-001', 'DEL-002'],
    });

    expect(getTicketState(database).activeRevenueCents).toBe(10_000);
    expect(getTicketState(database).lots[0]?.availableQuantity).toBe(3);
    expect(
      deleteTicketSale(database, { saleId: sale.id, reason: 'Venda cadastrada por engano' }),
    ).toEqual({ saleId: sale.id, deleted: true, wasCancelledFirst: true });

    const state = getTicketState(database);
    expect(state.sales).toHaveLength(0);
    expect(state.activeRevenueCents).toBe(0);
    expect(state.lots[0]?.availableQuantity).toBe(5);
    expect(getCashState(database).salesByMethod.pixCents).toBe(0);
    expect(
      database.sqlite.prepare('SELECT id FROM ticket_sales WHERE id = ?').get(sale.id),
    ).toBeUndefined();
    expect(
      database.sqlite.prepare('SELECT id FROM ticket_codes WHERE sale_id = ?').all(sale.id),
    ).toHaveLength(0);

    const audit = database.sqlite
      .prepare(
        `SELECT action, entity_type, entity_id, details_json
         FROM audit_log
         WHERE action = 'ticket.sale-deleted' AND entity_id = ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(sale.id) as
      | {
          readonly action: string;
          readonly entity_type: string;
          readonly entity_id: string;
          readonly details_json: string;
        }
      | undefined;
    expect(audit).toMatchObject({
      action: 'ticket.sale-deleted',
      entity_type: 'ticket-sale',
      entity_id: sale.id,
    });
    expect(JSON.parse(audit?.details_json ?? '{}')).toMatchObject({
      codes: ['DEL-001', 'DEL-002'],
      wasCancelledFirst: true,
    });
    database.close();
  });

  it('exclui diretamente uma venda que já foi cancelada', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento ingresso cancelado', startsAt: Date.now() });
    const lot = createTicketLot(database, {
      name: 'Lote cancelado',
      priceCents: 3000,
      capacity: 2,
    });
    const sale = createTicketSale(database, {
      lotId: lot.id,
      attendeeName: 'Venda cancelada',
      source: 'whatsapp',
      quantity: 1,
      paymentMethod: 'cash',
    });
    cancelTicketSale(database, { saleId: sale.id, reason: 'Cancelamento inicial' });

    expect(
      deleteTicketSale(database, { saleId: sale.id, reason: 'Remover registro incorreto' }),
    ).toEqual({ saleId: sale.id, deleted: true, wasCancelledFirst: false });
    expect(getTicketState(database).sales).toHaveLength(0);
    database.close();
  });

  it('bloqueia exclusão no perfil Caixa', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento exclusão Caixa', startsAt: Date.now() });
    const lot = createTicketLot(database, {
      name: 'Lote Caixa',
      priceCents: 1000,
      capacity: 1,
    });
    const sale = createTicketSale(database, {
      lotId: lot.id,
      attendeeName: 'Venda protegida',
      source: 'door',
      quantity: 1,
      paymentMethod: 'cash',
    });
    switchProfile(database, 'cashier');

    expect(() =>
      deleteTicketSale(database, { saleId: sale.id, reason: 'Tentativa no Caixa' }),
    ).toThrow('A administração de ingressos exige o perfil Produção.');
    database.close();
  });
});
