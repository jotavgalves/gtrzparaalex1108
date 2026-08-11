import { ArrowLeft, Pencil, Pin, PinOff, ReceiptText, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  CloseOrderInput,
  DeleteServicePointMode,
  OperationCatalogItem,
  Order,
  ServicePoint,
} from '@gtrz/contracts';

import { ProductVisual } from '../../shared/product/ProductVisual';
import { CancellationForm } from './CancellationForm';
import { CheckoutForm } from './CheckoutForm';
import { RecentOrdersPanel } from './RecentOrdersPanel';

interface OrderPanelProps {
  readonly servicePoint: ServicePoint;
  readonly order: Order | null;
  readonly history: readonly Order[];
  readonly catalog: readonly OperationCatalogItem[];
  readonly busy: boolean;
  readonly production: boolean;
  readonly onBack: () => void;
  readonly onRenameServicePoint: (servicePointId: string, label: string) => Promise<void>;
  readonly onSetServicePointPinned: (servicePointId: string, pinned: boolean) => Promise<void>;
  readonly onDeleteServicePoint: (input: {
    readonly servicePointId: string;
    readonly mode: DeleteServicePointMode;
    readonly reason: string;
  }) => Promise<void>;
  readonly onRemoveItem: (orderItemId: string) => Promise<void>;
  readonly onBindVoucher: (code: string) => Promise<void>;
  readonly onUnbindVoucher: () => Promise<void>;
  readonly onCloseOrder: (input: Omit<CloseOrderInput, 'orderId'>) => Promise<void>;
  readonly onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  readonly onReprintOrder: (orderId: string) => Promise<void>;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function OrderPanel({
  servicePoint,
  order,
  history,
  catalog,
  busy,
  production,
  onBack,
  onRenameServicePoint,
  onSetServicePointPinned,
  onDeleteServicePoint,
  onRemoveItem,
  onBindVoucher,
  onUnbindVoucher,
  onCloseOrder,
  onCancelOrder,
  onReprintOrder,
}: OrderPanelProps): React.JSX.Element {
  const [editingName, setEditingName] = useState(false);
  const [nextLabel, setNextLabel] = useState(servicePoint.label);
  const [deletingTable, setDeletingTable] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    setNextLabel(servicePoint.label);
    setEditingName(false);
    setDeletingTable(false);
    setDeleteReason('');
  }, [servicePoint.id, servicePoint.label]);

  return (
    <article className="panel order-panel">
      <div className="order-panel__header">
        <button
          aria-label="Voltar para mesas"
          className="icon-button order-panel__back"
          disabled={busy}
          onClick={onBack}
          title="Voltar para mesas"
          type="button"
        >
          <ArrowLeft size={17} aria-hidden="true" />
        </button>
        <div className="panel__heading">
          <ReceiptText size={20} aria-hidden="true" />
          <div>
            <h2>{servicePoint.label}</h2>
            <p>
              {order === null
                ? 'Selecione o primeiro item. A comanda só será criada quando houver algo nela.'
                : 'Comanda aberta · os preços ficam congelados ao adicionar cada item.'}
            </p>
          </div>
        </div>
      </div>

      {production && servicePoint.type === 'table' ? (
        <section className="service-point-admin" aria-label="Administração da mesa">
          <div className="service-point-admin__actions">
            <button
              className="button button--ghost button--compact"
              disabled={busy}
              onClick={() => {
                void onSetServicePointPinned(servicePoint.id, !servicePoint.pinned);
              }}
              type="button"
            >
              {servicePoint.pinned ? (
                <PinOff size={15} aria-hidden="true" />
              ) : (
                <Pin size={15} aria-hidden="true" />
              )}
              {servicePoint.pinned ? 'Desafixar' : 'Fixar'}
            </button>
            <button
              className="button button--secondary button--compact"
              disabled={busy}
              onClick={() => {
                setEditingName((current) => !current);
              }}
              type="button"
            >
              <Pencil size={15} aria-hidden="true" />
              Renomear
            </button>
            <button
              className="button button--danger button--compact"
              disabled={busy}
              onClick={() => {
                setDeletingTable((current) => !current);
              }}
              type="button"
            >
              <Trash2 size={15} aria-hidden="true" />
              Excluir
            </button>
          </div>

          {editingName ? (
            <form
              className="service-point-admin__rename"
              onSubmit={(event) => {
                event.preventDefault();
                void onRenameServicePoint(servicePoint.id, nextLabel).then(() => {
                  setEditingName(false);
                });
              }}
            >
              <label className="form-field">
                <span>Novo nome da mesa</span>
                <input
                  disabled={busy}
                  maxLength={40}
                  onChange={(event) => {
                    setNextLabel(event.target.value);
                  }}
                  value={nextLabel}
                />
              </label>
              <button
                className="button button--primary button--compact"
                disabled={busy || nextLabel.trim().length === 0}
                type="submit"
              >
                <Save size={15} aria-hidden="true" />
                Salvar
              </button>
            </form>
          ) : null}

          {deletingTable ? (
            <div className="service-point-admin__delete">
              <label className="form-field">
                <span>Motivo da exclusão</span>
                <input
                  disabled={busy}
                  onChange={(event) => {
                    setDeleteReason(event.target.value);
                  }}
                  placeholder="Ex.: mesa criada por engano"
                  value={deleteReason}
                />
              </label>
              <div className="service-point-admin__delete-actions">
                <button
                  className="button button--danger button--compact"
                  disabled={busy || deleteReason.trim().length < 3}
                  onClick={() => {
                    void onDeleteServicePoint({
                      servicePointId: servicePoint.id,
                      mode: 'delete-all',
                      reason: deleteReason,
                    });
                  }}
                  type="button"
                >
                  Excluir tudo
                </button>
                <button
                  className="button button--secondary button--compact"
                  disabled={busy || deleteReason.trim().length < 3}
                  onClick={() => {
                    void onDeleteServicePoint({
                      servicePointId: servicePoint.id,
                      mode: 'keep-sales-history',
                      reason: deleteReason,
                    });
                  }}
                  type="button"
                >
                  Manter vendas
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {order === null ? (
        <div className="operation-empty order-panel__empty-order">
          Nenhuma comanda aberta. Adicionar o primeiro produto ou combo inicia a venda.
        </div>
      ) : (
        <>
          <div className="order-items">
            {order.items.map((item) => {
              const catalogItem = catalog.find(
                (candidate) => candidate.id === item.itemId && candidate.kind === item.itemKind,
              );
              return (
                <div className="order-item" key={item.id}>
                  {catalogItem === undefined ? null : (
                    <ProductVisual
                      alt={item.itemName}
                      fallbackIcon={catalogItem.fallbackIcon}
                      imageDataUrl={catalogItem.imageDataUrl}
                      size="small"
                    />
                  )}
                  <span>
                    <strong>{item.itemName}</strong>
                    <small>
                      {item.quantity} × {formatMoney(item.unitPriceCents)}
                    </small>
                  </span>
                  <strong>{formatMoney(item.totalCents)}</strong>
                  <button
                    aria-label={`Remover ${item.itemName}`}
                    className="icon-button"
                    disabled={busy}
                    onClick={() => void onRemoveItem(item.id)}
                    type="button"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="order-summary">
            <span>Subtotal</span>
            <strong>{formatMoney(order.subtotalCents)}</strong>
          </div>
          <CheckoutForm
            busy={busy}
            onBindVoucher={onBindVoucher}
            onClose={onCloseOrder}
            onUnbindVoucher={onUnbindVoucher}
            order={order}
          />
          {production ? (
            <div className="order-cancellation">
              <CancellationForm
                busy={busy}
                label="Cancelar comanda"
                onSubmit={(reason) => onCancelOrder(order.id, reason)}
              />
            </div>
          ) : null}
        </>
      )}

      <RecentOrdersPanel
        busy={busy}
        canCancel={production}
        onCancel={onCancelOrder}
        onReprint={onReprintOrder}
        orders={history}
        title={`Histórico de ${servicePoint.label}`}
      />
    </article>
  );
}
