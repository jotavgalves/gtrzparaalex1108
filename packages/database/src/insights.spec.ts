import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  appendAudit,
  createEvent,
  createInventoryProduct,
  createProductCategory,
  getAuditState,
  getDashboardState,
  openDatabase,
  recordStockMovement,
  switchProfile,
  type DatabaseContext,
} from './index';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-insights-'));
  return openDatabase(path.join(temporaryDirectory, 'insights.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('dashboard and audit database', () => {
  it('consolida evento, estoque e atividade recente sem duplicar regras', async () => {
    const database = await createTemporaryDatabase();
    const event = createEvent(database, { name: 'Evento consolidado', startsAt: Date.now() });
    const category = createProductCategory(database, 'Bebidas consolidadas');
    const product = createInventoryProduct(database, {
      categoryId: category.id,
      name: 'Água consolidada',
      kind: 'drink',
      costCents: 200,
      salePriceCents: 500,
      lowStockThreshold: 5,
    });
    recordStockMovement(database, {
      productId: product.id,
      type: 'purchase',
      quantity: 3,
    });

    const dashboard = getDashboardState(database);

    expect(dashboard.activeEvent).toMatchObject({ id: event.id, name: 'Evento consolidado' });
    expect(dashboard.inventory).toEqual({
      units: 3,
      activeProducts: 1,
      lowStockProducts: 1,
      stockCostCents: 600,
    });
    expect(dashboard.grossSalesCents).toBe(0);
    expect(dashboard.recentActivity.length).toBeGreaterThan(0);
    database.close();
  });

  it('filtra a auditoria por conteúdo, evento, perfil e período', async () => {
    const database = await createTemporaryDatabase();
    const event = createEvent(database, { name: 'Evento pesquisável', startsAt: Date.now() });
    const before = Date.now();
    appendAudit(database, {
      action: 'test.searchable',
      entityType: 'test-record',
      entityId: 'registro-1',
      eventId: event.id,
      details: { marker: 'agulha-especial' },
    });
    const after = Date.now();

    const state = getAuditState(database, {
      eventId: event.id,
      profile: 'production',
      action: 'test.searchable',
      search: 'agulha-especial',
      from: before,
      to: after,
      limit: 10,
    });

    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({
      eventName: 'Evento pesquisável',
      action: 'test.searchable',
      entityId: 'registro-1',
      details: { marker: 'agulha-especial' },
    });
    expect(state.actions).toContain('test.searchable');
    expect(state.events).toContainEqual({ id: event.id, name: 'Evento pesquisável' });
    database.close();
  });

  it('protege indicadores financeiros e auditoria no perfil Caixa', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento protegido', startsAt: Date.now() });
    switchProfile(database, 'cashier');

    expect(() => getDashboardState(database)).toThrow(
      'A visão consolidada e a auditoria exigem o perfil Produção.',
    );
    expect(() => getAuditState(database)).toThrow(
      'A visão consolidada e a auditoria exigem o perfil Produção.',
    );
    database.close();
  });
});
