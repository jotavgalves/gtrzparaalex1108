import { Ban, CreditCard, Settings2, Trash2, WalletCards } from 'lucide-react';
import { useState } from 'react';

import type { Expense } from '@gtrz/contracts';

interface ExpenseCardProps {
  readonly expense: Expense;
  readonly busy: boolean;
  readonly onCancel: (expenseId: string, reason: string) => Promise<void>;
  readonly onDelete: (expenseId: string, reason: string) => Promise<void>;
}

const PAYMENT_LABELS = {
  cash: 'Dinheiro',
  pix: 'PIX',
  'credit-card': 'Crédito',
  'debit-card': 'Débito',
} as const;

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function ExpenseCard({
  expense,
  busy,
  onCancel,
  onDelete,
}: ExpenseCardProps): React.JSX.Element {
  const [reason, setReason] = useState('');
  const [managing, setManaging] = useState(false);

  return (
    <article className="expense-card expense-card--compact">
      <header className="expense-card__header">
        <span>
          <strong>{expense.description}</strong>
          <small>{expense.category}</small>
        </span>
        <span
          className={
            expense.status === 'active'
              ? 'status-badge status-badge--open'
              : 'status-badge status-badge--archived'
          }
        >
          {expense.status === 'active' ? 'Ativa' : 'Cancelada'}
        </span>
      </header>

      <div className="expense-card__value">
        <strong>{formatMoney(expense.amountCents)}</strong>
        <span>
          {expense.paymentMethod === 'cash' ? (
            <WalletCards size={15} aria-hidden="true" />
          ) : (
            <CreditCard size={15} aria-hidden="true" />
          )}
          {PAYMENT_LABELS[expense.paymentMethod]}
        </span>
      </div>

      {expense.note === null ? null : <p>{expense.note}</p>}

      <button
        className="button button--ghost button--compact"
        disabled={busy}
        onClick={() => {
          setManaging((value) => !value);
        }}
        type="button"
      >
        <Settings2 size={15} aria-hidden="true" />
        Gerenciar
      </button>

      {managing ? (
        <div className="expense-manage-drawer">
          <label className="form-field">
            <span>Motivo</span>
            <input
              disabled={busy}
              maxLength={240}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              placeholder="Ex.: lançamento duplicado"
              value={reason}
            />
          </label>
          <div className="expense-manage-drawer__actions">
            {expense.status === 'active' ? (
              <button
                className="button button--ghost button--compact"
                disabled={busy || reason.trim().length < 3}
                onClick={() => {
                  void onCancel(expense.id, reason.trim()).then(() => {
                    setReason('');
                    setManaging(false);
                  });
                }}
                type="button"
              >
                <Ban size={15} aria-hidden="true" />
                Somente cancelar
              </button>
            ) : null}
            <button
              className="button button--danger button--compact"
              disabled={busy || reason.trim().length < 3}
              onClick={() => {
                void onDelete(expense.id, reason.trim()).then(() => {
                  setReason('');
                  setManaging(false);
                });
              }}
              type="button"
            >
              <Trash2 size={15} aria-hidden="true" />
              Excluir definitivamente
            </button>
          </div>
          <small>
            A exclusão remove o lançamento. A auditoria da exclusão permanece registrada.
          </small>
        </div>
      ) : null}
    </article>
  );
}
