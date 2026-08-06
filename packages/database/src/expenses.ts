import { randomUUID } from 'node:crypto';

import { appendAudit } from './audit';
import { getSessionState } from './control';
import type { DatabasePaymentMethod } from './operation-types';
import type { DatabaseContext } from './types';

export type DatabaseExpenseStatus = 'active' | 'cancelled';

export interface DatabaseExpense {
  readonly id: string;
  readonly eventId: string;
  readonly category: string;
  readonly description: string;
  readonly amountCents: number;
  readonly paymentMethod: DatabasePaymentMethod;
  readonly note: string | null;
  readonly status: DatabaseExpenseStatus;
  readonly createdAt: number;
  readonly cancelledAt: number | null;
  readonly updatedAt: number;
}

export interface DatabaseExpenseState {
  readonly activeEventId: string | null;
  readonly expenses: readonly DatabaseExpense[];
}

interface ExpenseRow {
  readonly id: string;
  readonly event_id: string;
  readonly category: string;
  readonly description: string;
  readonly amount_cents: number;
  readonly payment_method: DatabasePaymentMethod;
  readonly note: string | null;
  readonly status: DatabaseExpenseStatus;
  readonly created_at: number;
  readonly cancelled_at: number | null;
  readonly updated_at: number;
}

function requireProduction(database: DatabaseContext): void {
  if (getSessionState(database).profile !== 'production') {
    throw new Error('A administração de despesas exige o perfil Produção.');
  }
}

function requireActiveEvent(database: DatabaseContext): string {
  const eventId = getSessionState(database).activeEvent?.id;

  if (eventId === undefined) {
    throw new Error('Selecione um evento aberto antes de registrar despesas.');
  }

  return eventId;
}

function normalizeOptionalText(value?: string): string | null {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? null : normalized;
}

function mapExpense(row: ExpenseRow): DatabaseExpense {
  return {
    id: row.id,
    eventId: row.event_id,
    category: row.category,
    description: row.description,
    amountCents: row.amount_cents,
    paymentMethod: row.payment_method,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    updatedAt: row.updated_at,
  };
}

function requireExpense(database: DatabaseContext, expenseId: string): ExpenseRow {
  const row = database.sqlite
    .prepare(
      `SELECT id, event_id, category, description, amount_cents, payment_method,
              note, status, created_at, cancelled_at, updated_at
       FROM expenses WHERE id = ?`,
    )
    .get(expenseId) as ExpenseRow | undefined;

  if (row === undefined) {
    throw new Error('A despesa informada não existe.');
  }

  return row;
}

export function getExpenseState(database: DatabaseContext): DatabaseExpenseState {
  const eventId = getSessionState(database).activeEvent?.id ?? null;

  if (eventId === null) {
    return { activeEventId: null, expenses: [] };
  }

  const rows = database.sqlite
    .prepare(
      `SELECT id, event_id, category, description, amount_cents, payment_method,
              note, status, created_at, cancelled_at, updated_at
       FROM expenses
       WHERE event_id = ?
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC`,
    )
    .all(eventId) as ExpenseRow[];
  return { activeEventId: eventId, expenses: rows.map(mapExpense) };
}

export function createExpense(
  database: DatabaseContext,
  input: {
    readonly category: string;
    readonly description: string;
    readonly amountCents: number;
    readonly paymentMethod: DatabasePaymentMethod;
    readonly note?: string;
  },
): DatabaseExpense {
  requireProduction(database);
  const eventId = requireActiveEvent(database);

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('O valor da despesa deve ser positivo.');
  }

  const expenseId = randomUUID();
  const category = input.category.trim();
  const description = input.description.trim();
  const note = normalizeOptionalText(input.note);
  const now = Date.now();

  database.sqlite.transaction(() => {
    database.sqlite
      .prepare(
        `INSERT INTO expenses
         (id, event_id, category, description, amount_cents, payment_method,
          note, status, created_at, cancelled_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?)`,
      )
      .run(
        expenseId,
        eventId,
        category,
        description,
        input.amountCents,
        input.paymentMethod,
        note,
        now,
        now,
      );
    appendAudit(database, {
      action: 'expense.created',
      entityType: 'expense',
      entityId: expenseId,
      eventId,
      details: {
        amountCents: input.amountCents,
        category,
        description,
        note,
        paymentMethod: input.paymentMethod,
      },
    });
  })();

  return mapExpense(requireExpense(database, expenseId));
}

export function cancelExpense(
  database: DatabaseContext,
  input: { readonly expenseId: string; readonly reason: string },
): DatabaseExpense {
  requireProduction(database);
  const eventId = requireActiveEvent(database);
  const expense = requireExpense(database, input.expenseId);

  if (expense.event_id !== eventId) {
    throw new Error('A despesa não pertence ao evento ativo.');
  }

  if (expense.status === 'cancelled') {
    throw new Error('Esta despesa já foi cancelada.');
  }

  const reason = input.reason.trim();
  const now = Date.now();
  database.sqlite.transaction(() => {
    database.sqlite
      .prepare(
        `UPDATE expenses
         SET status = 'cancelled', cancelled_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(now, now, expense.id);
    appendAudit(database, {
      action: 'expense.cancelled',
      entityType: 'expense',
      entityId: expense.id,
      eventId,
      details: {
        amountCents: expense.amount_cents,
        description: expense.description,
        reason,
      },
    });
  })();

  return mapExpense(requireExpense(database, expense.id));
}
