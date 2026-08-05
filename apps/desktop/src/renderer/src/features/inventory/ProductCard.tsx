import { ArrowLeftRight, CircleDollarSign, Pencil, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import type {
  InventoryProduct,
  ProductCategory,
  RecordStockMovementInput,
  UpdateProductInput,
} from '@gtrz/contracts';

import { ProductForm } from './ProductForm';
import { StockMovementForm } from './StockMovementForm';

interface ProductCardProps {
  readonly product: InventoryProduct;
  readonly categories: readonly ProductCategory[];
  readonly production: boolean;
  readonly hasActiveEvent: boolean;
  readonly busy: boolean;
  readonly onUpdate: (input: UpdateProductInput) => Promise<void>;
  readonly onMovement: (input: RecordStockMovementInput) => Promise<void>;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function ProductCard({
  product,
  categories,
  production,
  hasActiveEvent,
  busy,
  onUpdate,
  onMovement,
}: ProductCardProps): React.JSX.Element {
  const [mode, setMode] = useState<'view' | 'edit' | 'movement'>('view');

  if (mode === 'edit') {
    return (
      <article className="inventory-card inventory-card--expanded">
        <ProductForm
          busy={busy}
          categories={categories}
          onCancel={() => {
            setMode('view');
          }}
          onSubmit={async (input) => {
            await onUpdate(input);
            setMode('view');
          }}
          product={product}
        />
      </article>
    );
  }

  if (mode === 'movement') {
    return (
      <article className="inventory-card inventory-card--expanded">
        <StockMovementForm
          busy={busy}
          onCancel={() => {
            setMode('view');
          }}
          onSubmit={onMovement}
          product={product}
        />
      </article>
    );
  }

  return (
    <article
      className={product.active ? 'inventory-card' : 'inventory-card inventory-card--inactive'}
    >
      <div className="inventory-card__header">
        <div>
          <span>{product.categoryName}</span>
          <h2>{product.name}</h2>
        </div>
        <span className={product.lowStock ? 'stock-badge stock-badge--low' : 'stock-badge'}>
          {product.lowStock ? <TriangleAlert size={14} aria-hidden="true" /> : null}
          {product.quantity} un.
        </span>
      </div>

      <div className="inventory-card__prices">
        <div>
          <span>Venda</span>
          <strong>{formatMoney(product.salePriceCents)}</strong>
        </div>
        {product.financials === null ? null : (
          <>
            <div>
              <span>Custo</span>
              <strong>{formatMoney(product.financials.costCents)}</strong>
            </div>
            <div>
              <span>Lucro bruto</span>
              <strong>{formatMoney(product.financials.grossProfitCents)}</strong>
            </div>
            <div>
              <span>Margem</span>
              <strong>{product.financials.marginPercent.toFixed(2)}%</strong>
            </div>
          </>
        )}
      </div>

      <div className="inventory-card__footer">
        <span className="product-kind">
          <CircleDollarSign size={15} aria-hidden="true" />
          {product.kind === 'drink' ? 'Bebida' : 'Comida'}
        </span>
        {!product.active ? (
          <span className="status-badge status-badge--archived">Inativo</span>
        ) : null}
        {production ? (
          <div className="inventory-card__actions">
            <button
              className="button button--ghost button--compact"
              disabled={busy}
              onClick={() => {
                setMode('edit');
              }}
              type="button"
            >
              <Pencil size={15} aria-hidden="true" />
              Editar
            </button>
            <button
              className="button button--secondary button--compact"
              disabled={busy || !hasActiveEvent}
              onClick={() => {
                setMode('movement');
              }}
              title={hasActiveEvent ? undefined : 'Selecione um evento aberto.'}
              type="button"
            >
              <ArrowLeftRight size={15} aria-hidden="true" />
              Movimentar
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
