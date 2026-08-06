import { CreditCard, Plus, Trash2, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CloseOrderInput, Order, PaymentMethod } from '@gtrz/contracts';

import { VoucherCheckout } from './VoucherCheckout';

interface CheckoutFormProps {
  readonly order: Order;
  readonly busy: boolean;
  readonly onBindVoucher: (code: string) => Promise<void>;
  readonly onUnbindVoucher: () => Promise<void>;
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

function formatMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function parseMoney(value: string): number {
  const trimmed = value.trim().replaceAll(/\s/gu, '');

  if (trimmed.length === 0) {
    return 0;
  }

  const normalized = trimmed.includes(',')
    ? trimmed.replaceAll('.', '').replace(',', '.')
    : trimmed;
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

export function CheckoutForm({
  order,
  busy,
  onBindVoucher,
  onUnbindVoucher,
  onClose,
}: CheckoutFormProps): React.JSX.Element {
  const [discount, setDiscount] = useState('');
  const [payments, setPayments] = useState<readonly PaymentDraft[]>([newPayment()]);
  const [voucherAmount, setVoucherAmount] = useState('');
  const discountCents = parseMoney(discount);
  const discountInvalid = discountCents > order.subtotalCents;
  const totalCents = Math.max(order.subtotalCents - discountCents, 0);
  const allocation = order.voucherAllocation;
  const voucherCents = parseMoney(voucherAmount);

  useEffect(() => {
    if (allocation === null) {
      setVoucherAmount('');
      return;
    }

    setVoucherAmount((current) => {
      const currentCents = parseMoney(current);
      const maximumCents = Math.min(allocation.remainingBalanceCents, totalCents);

      if (currentCents > 0 && currentCents <= maximumCents) {
        return current;
      }

      return maximumCents > 0 ? formatMoneyInput(maximumCents) : '';
    });
  }, [allocation, totalCents]);

  const paymentCents = useMemo(
    () => payments.reduce((total, payment) => total + parseMoney(payment.amount), 0),
    [payments],
  );
  const informedCents = paymentCents + voucherCents;
  const totalChangeCents = useMemo(
    () =>
      payments.reduce((total, payment) => {
        if (payment.method !== 'cash') {
          return total;
        }

        const amountCents = parseMoney(payment.amount);
        const receivedCents = parseMoney(payment.received);
        return total + Math.max(receivedCents - amountCents, 0);
      }, 0),
    [payments],
  );
  const cashInvalid = payments.some((payment) => {
    if (payment.method !== 'cash') {
      return false;
    }

    const amountCents = parseMoney(payment.amount);
    const receivedCents = parseMoney(payment.received);
    return receivedCents > 0 && receivedCents < amountCents;
  });
  const voucherInvalid =
    voucherCents > 0 &&
    (allocation?.status !== 'active' ||
      voucherCents > allocation.remainingBalanceCents ||
      voucherCents > totalCents);
  const canSubmit =
    !busy &&
    !discountInvalid &&
    !cashInvalid &&
    !voucherInvalid &&
    totalCents > 0 &&
    informedCents === totalCents;

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

        if (!canSubmit) {
          return;
        }

        const normalizedPayments = payments
          .map((payment) => {
            const amountCents = parseMoney(payment.amount);
            const receivedCents = parseMoney(payment.received);
            return payment.method === 'cash' && receivedCents > 0
              ? { method: payment.method, amountCents, receivedCents }
              : { method: payment.method, amountCents };
          })
          .filter((payment) => payment.amountCents > 0);
        const voucherUses =
          allocation !== null && voucherCents > 0
            ? [{ code: allocation.code, amountCents: voucherCents }]
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
          aria-invalid={discountInvalid}
          disabled={busy}
          inputMode="decimal"
          onChange={(event) => {
            setDiscount(event.target.value);
          }}
          placeholder="0,00"
          value={discount}
        />
        {discountInvalid ? <small>O desconto não pode superar o subtotal.</small> : null}
      </label>

      <div className="checkout-total">
        <span>Total a receber</span>
        <strong>{formatMoney(totalCents)}</strong>
        <small>
          Informado: {formatMoney(informedCents)} · Restante:{' '}
          {formatMoney(Math.max(totalCents - informedCents, 0))}
        </small>
        {informedCents > totalCents ? (
          <small className="checkout-warning">
            O valor informado supera o total em {formatMoney(informedCents - totalCents)}.
          </small>
        ) : null}
      </div>

      <VoucherCheckout
        allocation={allocation}
        busy={busy}
        invalid={voucherInvalid}
        onBind={onBindVoucher}
        onUnbind={onUnbindVoucher}
        onValueChange={setVoucherAmount}
        orderId={order.id}
        value={voucherAmount}
        valueCents={voucherCents}
      />

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
                <div className="cash-received-field">
                  <input
                    aria-invalid={receivedIsInsufficient}
                    aria-label={`Valor recebido ${String(index + 1)}`}
                    disabled={busy}
                    inputMode="decimal"
                    onChange={(event) => {
                      updatePayment(payment.id, { received: event.target.value });
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
                  setPayments((current) => current.filter((item) => item.id !== payment.id));
                }}
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {totalChangeCents > 0 ? (
        <div className="checkout-change" role="status">
          <span>Troco a entregar</span>
          <strong>{formatMoney(totalChangeCents)}</strong>
        </div>
      ) : null}

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
        <button className="button" disabled={!canSubmit} type="submit">
          Concluir venda
        </button>
      </div>
    </form>
  );
}
