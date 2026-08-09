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
  listAuditEntries,
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
    const event = createEvent(database, { name: 'Evento exclusão despesa', startsAt: Date.now() });
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
    expect(database.sqlite.prepare('SELECT id FROM expenses WHERE id = ?').get(expense.id)).toBeUndefined();

    const audit = listAuditEntries(database, {
      eventId: event.id,
      search: 'expense.deleted',
    });
    expect(audit.entries[0]).toMatchObject({
      action: 'expense.deleted',
      entityType: 'expense',
      entityId: expense.id,
    });
    database.close();
  });

  it('permite excluir despesa já cancelada e bloqueia a operação no Caixa', async () => {
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
    expect(getExpenseState(database).expenses).toHaveLength(1);
    database.close();
  });
});
