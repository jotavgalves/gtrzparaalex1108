import { ChevronDown, History, Printer, RotateCcw } from 'lucide-react';

import type { Order } from '@gtrz/contracts';

import { CancellationForm } from './CancellationForm';

interface RecentOrdersPanelProps {
  readonly orders: readonly Order[];
  readonly busy: boolean;
  readonly canCancel: boolean;
  readonly title: string;
  readonly onCancel: (orderId: string, reason: string) => Promise<void>;
  readonly onReprint: (orderId: string) => Promise<void>;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(timestamp: number | null): string {
  if (timestamp === null) return 'Sem horário de fechamento';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(timestamp);
}

export function RecentOrdersPanel({
  orders,
  busy,
  canCancel,
  title,
  onCancel,
  onReprint,
}: RecentOrdersPanelProps): React.JSX.Element {
  return (
    <details className="history-drawer">
      <summary className="history-drawer__summary">
        <span className="history-drawer__identity">
          <History size={19} aria-hidden="true" />
          <span>
            <strong>{title}</strong>
            <small>
              {orders.length === 0
                ? 'Nenhuma venda ou cancelamento'
                : `${String(orders.length)} registro(s)`}
            </small>
          </span>
        </span>
        <ChevronDown className="history-drawer__chevron" size={18} aria-hidden="true" />
      </summary>

      <div className="history-drawer__content">
        {orders.length === 0 ? (
          <p className="operation-empty">Nenhuma venda concluída neste histórico.</p>
        ) : (
          <div className="recent-order-list">
            {orders.map((order) => (
              <article className="recent-order-card" key={order.id}>
                <div className="recent-order-card__summary">
                  <span>
                    <strong>{order.servicePointLabel}</strong>
                    <small>{formatDate(order.closedAt)}</small>
                  </span>
                  <span
                    className={
                      order.status === 'cancelled'
                        ? 'status-badge status-badge--archived'
                        : 'status-badge status-badge--open'
                    }
                  >
                    {order.status === 'cancelled' ? 'Cancelada' : 'Paga'}
                  </span>
                  <strong>{formatMoney(order.totalCents)}</strong>
                </div>

                <p className="recent-order-card__items">
                  {order.items
                    .map((item) => `${String(item.quantity)}× ${item.itemName}`)
                    .join(' · ')}
                </p>

                {order.status === 'paid' ? (
                  <div className="recent-order-card__tools">
                    <button
                      className="button button--secondary button--compact"
                      disabled={busy}
                      onClick={() => void onReprint(order.id)}
                      type="button"
                    >
                      <Printer size={15} aria-hidden="true" />
                      Reimprimir nota
                    </button>
                  </div>
                ) : null}

                {canCancel && order.status === 'paid' ? (
                  <div className="recent-order-card__cancel">
                    <RotateCcw size={18} aria-hidden="true" />
                    <CancellationForm
                      busy={busy}
                      label="Estornar venda"
                      onSubmit={(reason) => onCancel(order.id, reason)}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
