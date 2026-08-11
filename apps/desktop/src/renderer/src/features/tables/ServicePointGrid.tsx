import { Armchair, Pencil, Pin, PinOff, ShoppingBasket, Trash2 } from 'lucide-react';

import type { DeleteServicePointMode, ServicePoint } from '@gtrz/contracts';

interface ServicePointGridProps {
  readonly servicePoints: readonly ServicePoint[];
  readonly busy: boolean;
  readonly production: boolean;
  readonly onOpen: (servicePoint: ServicePoint) => Promise<void>;
  readonly onRenameServicePoint: (servicePointId: string, label: string) => Promise<void>;
  readonly onSetServicePointPinned: (servicePointId: string, pinned: boolean) => Promise<void>;
  readonly onDeleteServicePoint: (input: {
    readonly servicePointId: string;
    readonly mode: DeleteServicePointMode;
    readonly reason: string;
  }) => Promise<void>;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function ServicePointGrid({
  servicePoints,
  busy,
  production,
  onOpen,
  onRenameServicePoint,
  onSetServicePointPinned,
  onDeleteServicePoint,
}: ServicePointGridProps): React.JSX.Element {
  return (
    <div className="service-point-grid" aria-live="polite">
      {servicePoints.map((servicePoint) => {
        const Icon = servicePoint.type === 'counter' ? ShoppingBasket : Armchair;
        const open = servicePoint.status === 'open';

        return (
          <article
            className={open ? 'service-point-card service-point-card--open' : 'service-point-card'}
            key={servicePoint.id}
          >
            <button
              className="service-point-card__open"
              disabled={busy}
              onClick={() => {
                void onOpen(servicePoint);
              }}
              type="button"
            >
              <span className="service-point-card__icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="service-point-card__body">
                <strong>{servicePoint.label}</strong>
                <small>
                  {servicePoint.type === 'counter' ? 'Venda imediata' : 'Atendimento por mesa'}
                </small>
              </span>
              <span className={open ? 'status-badge status-badge--open' : 'status-badge'}>
                {open ? formatMoney(servicePoint.activeOrderTotalCents) : 'Livre'}
              </span>
              {servicePoint.pinned ? (
                <span className="service-point-card__pin" title="Mesa fixada">
                  <Pin size={14} aria-hidden="true" />
                </span>
              ) : null}
            </button>
            {production && servicePoint.type === 'table' ? (
              <div className="service-point-card__actions">
                <button
                  aria-label={servicePoint.pinned ? 'Desafixar mesa' : 'Fixar mesa'}
                  className="icon-button"
                  disabled={busy}
                  onClick={() => {
                    void onSetServicePointPinned(servicePoint.id, !servicePoint.pinned);
                  }}
                  title={servicePoint.pinned ? 'Desafixar mesa' : 'Fixar mesa'}
                  type="button"
                >
                  {servicePoint.pinned ? (
                    <PinOff size={15} aria-hidden="true" />
                  ) : (
                    <Pin size={15} aria-hidden="true" />
                  )}
                </button>
                <button
                  aria-label="Renomear mesa"
                  className="icon-button"
                  disabled={busy}
                  onClick={() => {
                    const label = window.prompt('Novo nome da mesa:', servicePoint.label);
                    if (label?.trim()) {
                      void onRenameServicePoint(servicePoint.id, label);
                    }
                  }}
                  title="Renomear mesa"
                  type="button"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  aria-label="Excluir mesa"
                  className="icon-button icon-button--danger"
                  disabled={busy}
                  onClick={() => {
                    const rawMode = window.prompt(
                      'Digite 1 para EXCLUIR TUDO ou 2 para MANTER VENDAS:',
                      '2',
                    );
                    const mode =
                      rawMode?.trim() === '1'
                        ? 'delete-all'
                        : rawMode?.trim() === '2'
                          ? 'keep-sales-history'
                          : null;
                    if (mode === null) return;
                    const reason = window.prompt('Motivo da exclusão da mesa:');
                    if (reason?.trim()) {
                      void onDeleteServicePoint({
                        servicePointId: servicePoint.id,
                        mode,
                        reason,
                      });
                    }
                  }}
                  title="Excluir mesa"
                  type="button"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
