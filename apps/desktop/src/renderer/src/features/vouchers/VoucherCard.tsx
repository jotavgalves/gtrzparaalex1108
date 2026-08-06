import { Ban, CheckCircle2, Copy, RefreshCw } from 'lucide-react';

import type { Voucher } from '@gtrz/contracts';

interface VoucherCardProps {
  readonly voucher: Voucher;
  readonly busy: boolean;
  readonly onChangeStatus: (voucherId: string, status: 'active' | 'cancelled') => Promise<void>;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

const STATUS_LABELS = {
  active: 'Ativo',
  exhausted: 'Esgotado',
  cancelled: 'Cancelado',
} as const;

export function VoucherCard({
  voucher,
  busy,
  onChangeStatus,
}: VoucherCardProps): React.JSX.Element {
  return (
    <article className="voucher-card">
      <header className="voucher-card__header">
        <span>
          <strong>{voucher.label}</strong>
          <code>{voucher.code}</code>
        </span>
        <span
          className={
            voucher.status === 'active'
              ? 'status-badge status-badge--open'
              : 'status-badge status-badge--archived'
          }
        >
          {STATUS_LABELS[voucher.status]}
        </span>
      </header>

      <div className="voucher-card__balance">
        <span>Saldo disponível</span>
        <strong>{formatMoney(voucher.remainingBalanceCents)}</strong>
        <small>Emitido com {formatMoney(voucher.initialBalanceCents)}</small>
      </div>

      <div className="voucher-card__actions">
        <button
          className="button button--ghost button--compact"
          disabled={busy}
          onClick={() => {
            void navigator.clipboard.writeText(voucher.code);
          }}
          type="button"
        >
          <Copy size={15} aria-hidden="true" />
          Copiar código
        </button>
        {voucher.status === 'active' ? (
          <button
            className="button button--ghost button--compact"
            disabled={busy}
            onClick={() => {
              void onChangeStatus(voucher.id, 'cancelled');
            }}
            type="button"
          >
            <Ban size={15} aria-hidden="true" />
            Cancelar
          </button>
        ) : null}
        {voucher.status === 'cancelled' && voucher.remainingBalanceCents > 0 ? (
          <button
            className="button button--secondary button--compact"
            disabled={busy}
            onClick={() => {
              void onChangeStatus(voucher.id, 'active');
            }}
            type="button"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Reativar
          </button>
        ) : null}
        {voucher.status === 'exhausted' ? (
          <span className="voucher-card__complete">
            <CheckCircle2 size={15} aria-hidden="true" />
            Saldo consumido
          </span>
        ) : null}
      </div>
    </article>
  );
}
