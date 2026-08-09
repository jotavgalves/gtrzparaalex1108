import { Ban, Copy, Gift, Settings2, TicketCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { TicketSale } from '@gtrz/contracts';

interface TicketSaleCardProps {
  readonly sale: TicketSale;
  readonly busy: boolean;
  readonly onCancel: (saleId: string, reason: string) => Promise<void>;
  readonly onDelete: (saleId: string, reason: string) => Promise<void>;
}

const SOURCE_LABELS = {
  sympla: 'Sympla',
  whatsapp: 'WhatsApp',
  door: 'Porta',
  courtesy: 'Cortesia',
} as const;

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function TicketSaleCard({
  sale,
  busy,
  onCancel,
  onDelete,
}: TicketSaleCardProps): React.JSX.Element {
  const [reason, setReason] = useState('');
  const [managing, setManaging] = useState(false);

  return (
    <article className="ticket-sale-card">
      <header className="ticket-sale-card__header">
        <span>
          {sale.source === 'courtesy' ? (
            <Gift size={18} aria-hidden="true" />
          ) : (
            <TicketCheck size={18} aria-hidden="true" />
          )}
          <span>
            <strong>{sale.attendeeName}</strong>
            <small>
              {sale.lotName} · {SOURCE_LABELS[sale.source]}
            </small>
          </span>
        </span>
        <span
          className={
            sale.status === 'active'
              ? 'status-badge status-badge--open'
              : 'status-badge status-badge--archived'
          }
        >
          {sale.status === 'active' ? 'Ativa' : 'Cancelada'}
        </span>
      </header>

      <div className="ticket-sale-card__summary">
        <span>
          <small>Quantidade</small>
          <strong>{sale.quantity}</strong>
        </span>
        <span>
          <small>Unitário</small>
          <strong>{formatMoney(sale.unitPriceCents)}</strong>
        </span>
        <span>
          <small>Total</small>
          <strong>{formatMoney(sale.totalCents)}</strong>
        </span>
      </div>

      <div className="ticket-code-list">
        {sale.codes.map((ticketCode) => (
          <button
            className="ticket-code"
            disabled={busy}
            key={ticketCode.id}
            onClick={() => {
              void navigator.clipboard.writeText(ticketCode.code);
            }}
            type="button"
          >
            <code>{ticketCode.code}</code>
            <Copy size={14} aria-hidden="true" />
          </button>
        ))}
      </div>

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
        <div className="ticket-sale-manage">
          <label className="form-field">
            <span>Motivo</span>
            <input
              disabled={busy}
              maxLength={240}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              placeholder="Ex.: venda duplicada"
              value={reason}
            />
          </label>
          <div className="ticket-sale-manage__actions">
            {sale.status === 'active' ? (
              <button
                className="button button--ghost button--compact"
                disabled={busy || reason.trim().length < 3}
                onClick={() => {
                  void onCancel(sale.id, reason.trim()).then(() => {
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
                void onDelete(sale.id, reason.trim()).then(() => {
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
            Se a venda ainda estiver ativa, a exclusão primeiro cancela a venda, devolve
            capacidade e receita e só depois remove a venda e seus códigos.
          </small>
        </div>
      ) : null}
    </article>
  );
}
