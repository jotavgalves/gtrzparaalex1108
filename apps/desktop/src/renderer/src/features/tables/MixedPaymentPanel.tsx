import { CreditCard, Plus, Trash2 } from 'lucide-react';

import type { PaymentMethod } from '@gtrz/contracts';

import {
  formatMoney,
  parseMoney,
  PAYMENT_LABELS,
  type PaymentDraft,
} from './checkout-payment-utils';

interface MixedPaymentPanelProps {
  readonly busy: boolean;
  readonly payments: readonly PaymentDraft[];
  readonly onUpdate: (id: string, patch: Partial<PaymentDraft>) => void;
  readonly onRemove: (id: string) => void;
  readonly onAdd: () => void;
}

export function MixedPaymentPanel({
  busy,
  payments,
  onUpdate,
  onRemove,
  onAdd,
}: MixedPaymentPanelProps): React.JSX.Element {
  return (
    <>
      <div className="payment-list">
        {payments.map((payment, index) => {
          const amountCents = parseMoney(payment.amount);
          const receivedCents = parseMoney(payment.received);
          const changeCents = Math.max(receivedCents - amountCents, 0);
          const receivedIsInsufficient =
            payment.method === 'cash' && receivedCents > 0 && receivedCents < amountCents;

          return (
            <div className="payment-row" key={payment.id}>
              <select
                aria-label={`Forma de pagamento ${String(index + 1)}`}
                disabled={busy}
                onChange={(event) => {
                  onUpdate(payment.id, {
                    method: event.target.value as PaymentMethod,
                    received: '',
                  });
                }}
                value={payment.method}
              >
                {Object.entries(PAYMENT_LABELS).map(([method, label]) => (
                  <option key={method} value={method}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Valor do pagamento ${String(index + 1)}`}
                disabled={busy}
                inputMode="decimal"
                onChange={(event) => {
                  onUpdate(payment.id, { amount: event.target.value });
                }}
                placeholder="Valor aplicado"
                value={payment.amount}
              />
              {payment.method === 'cash' ? (
                <div className="cash-received-field">
                  <input
                    aria-invalid={receivedIsInsufficient}
                    aria-label={`Valor recebido ${String(index + 1)}`}
                    disabled={busy}
                    inputMode="decimal"
                    onChange={(event) => {
                      onUpdate(payment.id, { received: event.target.value });
                    }}
                    placeholder="Valor recebido"
                    value={payment.received}
                  />
                  <small className={receivedIsInsufficient ? 'checkout-warning' : undefined}>
                    {receivedIsInsufficient
                      ? `Faltam ${formatMoney(amountCents - receivedCents)}`
                      : `Troco: ${formatMoney(changeCents)}`}
                  </small>
                </div>
              ) : (
                <span className="payment-row__digital">
                  <CreditCard size={16} aria-hidden="true" />
                  Sem troco
                </span>
              )}
              <button
                aria-label={`Remover pagamento ${String(index + 1)}`}
                className="icon-button"
                disabled={busy || payments.length === 1}
                onClick={() => {
                  onRemove(payment.id);
                }}
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="button button--secondary checkout-add-payment"
        disabled={busy}
        onClick={onAdd}
        type="button"
      >
        <Plus size={16} aria-hidden="true" />
        Adicionar pagamento
      </button>
    </>
  );
}
