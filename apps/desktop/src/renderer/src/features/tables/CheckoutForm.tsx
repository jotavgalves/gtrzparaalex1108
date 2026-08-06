import { CreditCard, Plus, TicketCheck, Trash2, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CloseOrderInput, Order, PaymentMethod } from '@gtrz/contracts';

interface CheckoutFormProps {
  readonly order: Order;
  readonly busy: boolean;
  readonly onClose: (input: Omit<CloseOrderInput, 'orderId'>) => Promise<void>;
}

interface PaymentDraft {
  readonly id: string;
  readonly method: PaymentMethod;
  readonly amount: string;
  readonly received: string;
}

const PAYMENT_LABELS: Readonly<Record<PaymentMethod, string>> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  'credit-card': 'Crédito',
  'debit-card': 'Débito',
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function parseMoney(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function newPayment(method: PaymentMethod = 'cash'): PaymentDraft {
  return {
    id: `${String(Date.now())}-${Math.random().toString(16).slice(2)}`,
    method,
    amount: '',
    received: '',
  };
}

export function CheckoutForm({ order, busy, onClose }: CheckoutFormProps): React.JSX.Element {
  const [discount, setDiscount] = useState('');
  const [payments, setPayments] = useState<readonly PaymentDraft[]>([newPayment()]);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const discountCents = parseMoney(discount);
  const totalCents = Math.max(order.subtotalCents - discountCents, 0);
  const voucherCents = parseMoney(voucherAmount);
  const informedCents = useMemo(
    () => payments.reduce((total, payment) => total + parseMoney(payment.amount), 0) + voucherCents,
    [payments, voucherCents],
  );

  const updatePayment = (id: string, patch: Partial<PaymentDraft>): void => {
    setPayments((current) =>
      current.map((payment) => (payment.id === id ? { ...payment, ...patch } : payment)),
    );
  };

  return (
    <form
      className="checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        const normalizedPayments = payments
          .map((payment) => {
            const amountCents = parseMoney(payment.amount);
            const receivedCents = parseMoney(payment.received);
            return payment.method === 'cash' && receivedCents > 0
              ? { method: payment.method, amountCents, receivedCents }
              : { method: payment.method, amountCents };
          })
          .filter((payment) => payment.amountCents > 0);
        const normalizedCode = voucherCode.trim();
        const voucherUses =
          normalizedCode.length >= 4 && voucherCents > 0
            ? [{ code: normalizedCode, amountCents: voucherCents }]
            : [];

        void onClose({
          discountCents,
          payments: normalizedPayments,
          voucherUses,
        });
      }}
    >
      <div className="checkout-form__heading">
        <WalletCards size={19} aria-hidden="true" />
        <div>
          <h3>Fechar comanda</h3>
          <p>Combine voucher, dinheiro, PIX, crédito ou débito.</p>
        </div>
      </div>

      <label className="form-field">
        <span>Desconto em reais</span>
        <input
          disabled={busy}
          inputMode="decimal"
          onChange={(event) => {
            setDiscount(event.target.value);
          }}
          placeholder="0,00"
          value={discount}
        />
      </label>

      <div className="checkout-total">
        <span>Total a receber</span>
        <strong>{formatMoney(totalCents)}</strong>
        <small>
          Informado: {formatMoney(informedCents)} · Restante:{' '}
          {formatMoney(Math.max(totalCents - informedCents, 0))}
        </small>
      </div>

      <div className="voucher-payment-row">
        <TicketCheck size={18} aria-hidden="true" />
        <label className="form-field">
          <span>Código do voucher</span>
          <input
            disabled={busy}
            onChange={(event) => {
              setVoucherCode(event.target.value.toLocaleUpperCase('pt-BR'));
            }}
            placeholder="GTRZ-XXXXXXXX"
            value={voucherCode}
          />
        </label>
        <label className="form-field">
          <span>Valor do voucher</span>
          <input
            disabled={busy}
            inputMode="decimal"
            onChange={(event) => {
              setVoucherAmount(event.target.value);
            }}
            placeholder="0,00"
            value={voucherAmount}
          />
        </label>
      </div>

      <div className="payment-list">
        {payments.map((payment, index) => (
          <div className="payment-row" key={payment.id}>
            <select
              aria-label={`Forma de pagamento ${String(index + 1)}`}
              disabled={busy}
              onChange={(event) => {
                updatePayment(payment.id, {
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
                updatePayment(payment.id, { amount: event.target.value });
              }}
              placeholder="Valor aplicado"
              value={payment.amount}
            />
            {payment.method === 'cash' ? (
              <input
                aria-label={`Valor recebido ${String(index + 1)}`}
                disabled={busy}
                inputMode="decimal"
                onChange={(event) => {
                  updatePayment(payment.id, { received: event.target.value });
                }}
                placeholder="Recebido"
                value={payment.received}
              />
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
                setPayments((current) => current.filter((item) => item.id !== payment.id));
              }}
              type="button"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="checkout-form__actions">
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => {
            setPayments((current) => [...current, newPayment('pix')]);
          }}
          type="button"
        >
          <Plus size={16} aria-hidden="true" />
          Adicionar pagamento
        </button>
        <button
          className="button"
          disabled={busy || totalCents <= 0 || informedCents !== totalCents}
          type="submit"
        >
          Concluir venda
        </button>
      </div>
    </form>
  );
}
