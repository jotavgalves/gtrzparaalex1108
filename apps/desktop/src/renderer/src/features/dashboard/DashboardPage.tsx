import {
  Activity,
  Banknote,
  Boxes,
  CircleDollarSign,
  RefreshCw,
  Ticket,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';

import type { DashboardState, InsightAuditRecord } from '@gtrz/contracts';

import { useDashboard } from './useDashboard';

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(timestamp);
}

function describeAction(record: InsightAuditRecord): string {
  const labels: Readonly<Record<string, string>> = {
    'event.created': 'Evento criado',
    'event.selected': 'Evento selecionado',
    'operations.order-opened': 'Comanda aberta',
    'operations.order-paid': 'Venda concluída',
    'operations.order-cancelled': 'Comanda cancelada',
    'operations.order-refunded': 'Venda estornada',
    'inventory.stock-moved': 'Estoque movimentado',
    'voucher.created': 'Voucher emitido',
    'expense.created': 'Despesa registrada',
    'ticket.sale-created': 'Ingressos vendidos',
    'event.closed-with-backup': 'Evento encerrado',
  };
  return labels[record.action] ?? record.action.replaceAll('.', ' · ');
}

function SalesMethods({ state }: { readonly state: DashboardState }): React.JSX.Element {
  const methods = [
    ['Dinheiro', state.salesByMethod.cashCents],
    ['PIX', state.salesByMethod.pixCents],
    ['Crédito', state.salesByMethod.creditCardCents],
    ['Débito', state.salesByMethod.debitCardCents],
    ['Voucher', state.salesByMethod.voucherCents],
  ] as const;

  return (
    <article className="panel insight-panel">
      <div className="panel__heading">
        <WalletCards size={20} aria-hidden="true" />
        <div>
          <h2>Recebimentos</h2>
          <p>Distribuição consolidada por meio de pagamento.</p>
        </div>
      </div>
      <div className="insight-breakdown">
        {methods.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{formatMoney(value)}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function OperationalHealth({ state }: { readonly state: DashboardState }): React.JSX.Element {
  return (
    <article className="panel insight-panel">
      <div className="panel__heading">
        <Activity size={20} aria-hidden="true" />
        <div>
          <h2>Saúde operacional</h2>
          <p>Pendências que exigem atenção antes do encerramento.</p>
        </div>
      </div>
      <div className="insight-health-grid">
        <div
          className={
            state.orders.open > 0 ? 'insight-health insight-health--warning' : 'insight-health'
          }
        >
          <span>Comandas abertas</span>
          <strong>{state.orders.open}</strong>
        </div>
        <div
          className={
            state.inventory.lowStockProducts > 0
              ? 'insight-health insight-health--warning'
              : 'insight-health'
          }
        >
          <span>Estoque baixo</span>
          <strong>{state.inventory.lowStockProducts}</strong>
        </div>
        <div className="insight-health">
          <span>Vouchers ativos</span>
          <strong>{state.vouchers.active}</strong>
        </div>
        <div className="insight-health">
          <span>Caixa</span>
          <strong>
            {state.cashRegisterStatus === 'open'
              ? 'Aberto'
              : state.cashRegisterStatus === 'closed'
                ? 'Fechado'
                : 'Não aberto'}
          </strong>
        </div>
      </div>
    </article>
  );
}

export function DashboardPage(): React.JSX.Element {
  const { state, loading, error, reload } = useDashboard();

  return (
    <section className="feature-page">
      <header className="feature-header">
        <div>
          <span className="eyebrow">Consolidação em tempo real</span>
          <h1>Visão geral</h1>
          <p>Vendas, despesas, caixa, estoque, ingressos e vouchers do evento ativo.</p>
        </div>
        <button
          className="button button--secondary"
          disabled={loading}
          onClick={() => {
            void reload();
          }}
          type="button"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atualizar
        </button>
      </header>

      {error === null ? null : <p className="form-error">{error}</p>}
      {loading && state === null ? (
        <div className="route-state">Carregando indicadores…</div>
      ) : null}

      {!loading && state?.activeEvent === null ? (
        <div className="empty-state">
          <CircleDollarSign size={34} aria-hidden="true" />
          <h2>Nenhum evento em operação</h2>
          <p>Selecione um evento aberto para acompanhar os indicadores consolidados.</p>
        </div>
      ) : null}

      {state?.activeEvent === null || state === null ? null : (
        <>
          <article className="dashboard-event-banner">
            <div>
              <span>Evento em operação</span>
              <strong>{state.activeEvent.name}</strong>
            </div>
            <small>Início: {formatDate(state.activeEvent.startsAt)}</small>
          </article>

          <div className="summary-grid">
            <article className="summary-card summary-card--accent">
              <span>Faturamento</span>
              <strong>{formatMoney(state.grossSalesCents)}</strong>
              <small>{state.orders.paid} vendas concluídas</small>
            </article>
            <article className="summary-card">
              <span>Despesas ativas</span>
              <strong>{formatMoney(state.activeExpensesCents)}</strong>
              <small>Valores não cancelados</small>
            </article>
            <article className="summary-card">
              <span>Resultado projetado</span>
              <strong>{formatMoney(state.projectedResultCents)}</strong>
              <small>Receita menos despesas</small>
            </article>
            <article className="summary-card">
              <span>Caixa físico esperado</span>
              <strong>{formatMoney(state.expectedCashCents)}</strong>
              <small>Dinheiro após movimentações</small>
            </article>
          </div>

          <div className="insight-grid">
            <SalesMethods state={state} />
            <OperationalHealth state={state} />
          </div>

          <div className="insight-kpi-grid">
            <article className="insight-kpi">
              <Ticket size={19} aria-hidden="true" />
              <span>Ingressos pagos</span>
              <strong>{state.tickets.sold}</strong>
              <small>{formatMoney(state.tickets.revenueCents)} em receita</small>
            </article>
            <article className="insight-kpi">
              <Boxes size={19} aria-hidden="true" />
              <span>Estoque do evento</span>
              <strong>{state.inventory.units} un.</strong>
              <small>{formatMoney(state.inventory.stockCostCents)} em custo</small>
            </article>
            <article className="insight-kpi">
              <Banknote size={19} aria-hidden="true" />
              <span>Saldo em vouchers</span>
              <strong>{formatMoney(state.vouchers.outstandingBalanceCents)}</strong>
              <small>{state.vouchers.active} vouchers ativos</small>
            </article>
            <article className="insight-kpi">
              <TriangleAlert size={19} aria-hidden="true" />
              <span>Cancelamentos</span>
              <strong>{state.orders.cancelled}</strong>
              <small>Comandas canceladas ou estornadas</small>
            </article>
          </div>

          <article className="panel insight-panel">
            <div className="panel__heading">
              <Activity size={20} aria-hidden="true" />
              <div>
                <h2>Atividade recente</h2>
                <p>Últimas operações registradas na auditoria do evento.</p>
              </div>
            </div>
            <div className="activity-list">
              {state.recentActivity.length === 0 ? (
                <p className="inventory-helper">Nenhuma atividade registrada.</p>
              ) : (
                state.recentActivity.map((record) => (
                  <div className="activity-row" key={record.id}>
                    <div>
                      <strong>{describeAction(record)}</strong>
                      <span>{record.entityType}</span>
                    </div>
                    <time>{formatDate(record.createdAt)}</time>
                  </div>
                ))
              )}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
