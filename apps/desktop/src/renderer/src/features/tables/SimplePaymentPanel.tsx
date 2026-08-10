import { CreditCard } from 'lucide-react';

import type { PaymentMethod } from '@gtrz/contracts';

import { formatMoney, parseMoney, PAYMENT_LABELS } from './checkout-payment-utils';

interface SimplePaymentPanelProps {
  readonly busy: boolean;
  readonly amountCents: number;
  readonly method: PaymentMethod;
  readonly received: string;
  readonly cashInvalid: boolean;
  readonly onMethodChange: (method: PaymentMethod) => void;
  readonly onReceivedChange: (value: string) => void;
}

export function SimplePaymentPanel({
  busy,
  amountCents,
  method,
  received,
  cashInvalid,
  onMethodChange,
  onReceivedChange,
}: SimplePaymentPanelProps): React.JSX.Element {
  const receivedCents = parseMoney(received);
  const changeCents = method === 'cash' ? Math.max(receivedCents - amountCents, 0) : 0;

  return (
    <div className="simple-payment-panel">
      {amountCents === 0 ? (
        <p className="operation-empty">O voucher cobre todo o valor desta venda.</p>
      ) : (
        <>
          <label className="form-field">
            <span>Forma de pagamento</span>
            <select
              aria-label="Forma de pagamento"
              disabled={busy}
              onChange={(event) => {
                onMethodChange(event.target.value as PaymentMethod);
              }}
              value={method}
            >
              {Object.entries(PAYMENT_LABELS).map(([paymentMethod, label]) => (
                <option key={paymentMethod} value={paymentMethod}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="simple-payment-panel__amount">
            <span>Valor cobrado</span>
            <strong>{formatMoney(amountCents)}</strong>
            <small>Aplicado automaticamente ao saldo da venda.</small>
          </div>
          {method === 'cash' ? (
            <label className="form-field">
              <span>Valor recebido, opcional</span>
              <input
                aria-invalid={cashInvalid}
                aria-label="Valor recebido"
                disabled={busy}
                inputMode="decimal"
                onChange={(event) => {
                  onReceivedChange(event.target.value);
                }}
                placeholder={`Em branco = ${formatMoney(amountCents)}`}
                value={received}
              />
              <small className={cashInvalid ? 'checkout-warning' : undefined}>
                {cashInvalid
                  ? `Faltam ${formatMoney(amountCents - receivedCents)}`
                  : `Troco: ${formatMoney(changeCents)}`}
              </small>
            </label>
          ) : (
            <span className="payment-row__digital simple-payment-panel__digital">
              <CreditCard size={16} aria-hidden="true" />
              Cobrança exata, sem troco
            </span>
          )}
        </>
      )}
    </div>
  );
}
