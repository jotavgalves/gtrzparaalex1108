import { Ban, CreditCard, Settings2, Trash2, WalletCards } from 'lucide-react';
import { useState } from 'react';

import type { Expense, ExpensePaymentStatus } from '@gtrz/contracts';

interface ExpenseCardProps {
  readonly expense: Expense;
  readonly busy: boolean;
  readonly onPaymentStatusChange: (
    expenseId: string,
    paymentStatus: ExpensePaymentStatus,
  ) => Promise<void>;
  readonly onCancel: (expenseId: string, reason: string) => Promise<void>;
  readonly onDelete: (expenseId: string, reason: string) => Promise<void>;
}

const PAYMENT_LABELS = {
  cash: 'Dinheiro',
  pix: 'PIX',
  'credit-card': 'Crédito',
  'debit-card': 'Débito',
} as const;

const STATUS_LABELS: Readonly<Record<ExpensePaymentStatus, string>> = {
  open: 'Em aberto',
  partial: 'Parcial',
  paid: 'Paga',
};

const STATUS_CLASSES: Readonly<Record<ExpensePaymentStatus, string>> = {
  open: 'status-badge status-badge--open',
  partial: 'status-badge status-badge--selected',
  paid: 'status-badge status-badge--closed',
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function ExpenseCard({
  expense,
  busy,
  onPaymentStatusChange,
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
            expense.status === 'cancelled'
              ? 'status-badge status-badge--archived'
              : STATUS_CLASSES[expense.paymentStatus]
          }
        >
          {expense.status === 'cancelled' ? 'Cancelada' : STATUS_LABELS[expense.paymentStatus]}
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
          {expense.status === 'active' ? (
            <label className="form-field">
              <span>Situação do pagamento</span>
              <select
                disabled={busy}
                onChange={(event) => {
                  void onPaymentStatusChange(
                    expense.id,
                    event.target.value as ExpensePaymentStatus,
                  );
                }}
                value={expense.paymentStatus}
              >
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <small>
                Esta situação é somente controle interno e não altera o cálculo do resultado.
              </small>
            </label>
          ) : null}

          <label className="form-field">
            <span>Motivo para cancelar ou excluir</span>
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
                Cancelar lançamento
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
            Cancelar retira a despesa do resultado. Excluir remove o lançamento e preserva somente o
            registro da exclusão na auditoria.
          </small>
        </div>
      ) : null}
    </article>
  );
}
