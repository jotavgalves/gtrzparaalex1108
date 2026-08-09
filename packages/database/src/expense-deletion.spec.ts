import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createEvent,
  createExpense,
  deleteExpense,
  getCashState,
  getExpenseState,
  openDatabase,
  switchProfile,
  type DatabaseContext,
} from './index';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-expense-delete-'));
  return openDatabase(path.join(temporaryDirectory, 'expense-delete.sqlite'));
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('expense deletion', () => {
  it('remove a despesa do banco e dos totais, preservando auditoria', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento exclusão despesa', startsAt: Date.now() });
    const expense = createExpense(database, {
      category: 'Operação',
      description: 'Despesa lançada errada',
      amountCents: 1250,
      paymentMethod: 'pix',
      note: 'Valor incorreto',
    });

    expect(getCashState(database).activeExpensesCents).toBe(1250);
    expect(
      deleteExpense(database, { expenseId: expense.id, reason: 'Lançamento feito por engano' }),
    ).toEqual({ expenseId: expense.id, deleted: true });
    expect(getExpenseState(database).expenses).toHaveLength(0);
    expect(getCashState(database).activeExpensesCents).toBe(0);
    expect(
      database.sqlite.prepare('SELECT id FROM expenses WHERE id = ?').get(expense.id),
    ).toBeUndefined();

    const audit = database.sqlite
      .prepare(
        `SELECT action, entity_type, entity_id, details_json
         FROM audit_log
         WHERE action = 'expense.deleted' AND entity_id = ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(expense.id) as
      | {
          readonly action: string;
          readonly entity_type: string;
          readonly entity_id: string;
          readonly details_json: string;
        }
      | undefined;
    expect(audit).toMatchObject({
      action: 'expense.deleted',
      entity_type: 'expense',
      entity_id: expense.id,
    });
    expect(JSON.parse(audit?.details_json ?? '{}')).toMatchObject({
      amountCents: 1250,
      category: 'Operação',
      description: 'Despesa lançada errada',
      previousStatus: 'active',
      reason: 'Lançamento feito por engano',
    });
    database.close();
  });

  it('bloqueia a exclusão no perfil Caixa', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento despesa Caixa', startsAt: Date.now() });
    const expense = createExpense(database, {
      category: 'Equipe',
      description: 'Despesa controlada',
      amountCents: 500,
      paymentMethod: 'cash',
    });
    switchProfile(database, 'cashier');

    expect(() =>
      deleteExpense(database, { expenseId: expense.id, reason: 'Tentativa do Caixa' }),
    ).toThrow('A administração de despesas exige o perfil Produção.');
    database.close();
  });
});
