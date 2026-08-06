import { Ban, CreditCard, WalletCards } from 'lucide-react';
import { useState } from 'react';

import type { Expense } from '@gtrz/contracts';

interface ExpenseCardProps {
  readonly expense: Expense;
  readonly busy: boolean;
  readonly onCancel: (expenseId: string, reason: string) => Promise<void>;
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

export function ExpenseCard({ expense, busy, onCancel }: ExpenseCardProps): React.JSX.Element {
  const [reason, setReason] = useState('');

  return (
    <article className="expense-card">
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

      {expense.status === 'active' ? (
        <form
          className="expense-cancel-form"
          onSubmit={(event) => {
            event.preventDefault();
            const normalizedReason = reason.trim();

            if (normalizedReason.length < 3) {
              return;
            }

            void onCancel(expense.id, normalizedReason).then(() => {
              setReason('');
            });
          }}
        >
          <label className="form-field">
            <span>Motivo do cancelamento</span>
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
          <button
            className="button button--ghost button--compact"
            disabled={busy || reason.trim().length < 3}
            type="submit"
          >
            <Ban size={15} aria-hidden="true" />
            Cancelar despesa
          </button>
        </form>
      ) : null}
    </article>
  );
}
