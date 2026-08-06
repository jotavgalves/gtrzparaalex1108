import { ReceiptText, RefreshCw, TriangleAlert } from 'lucide-react';

import { ExpenseCard } from './ExpenseCard';
import { ExpenseForm } from './ExpenseForm';
import { useExpenses } from './useExpenses';

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function ExpensesPage(): React.JSX.Element {
  const { state, loading, busy, error, message, reload, createExpense, cancelExpense } =
    useExpenses();
  const expenses = state?.expenses ?? [];
  const activeExpenses = expenses.filter((expense) => expense.status === 'active');
  const cancelledExpenses = expenses.filter((expense) => expense.status === 'cancelled');
  const totalCents = activeExpenses.reduce((total, expense) => total + expense.amountCents, 0);
  const cashCents = activeExpenses
    .filter((expense) => expense.paymentMethod === 'cash')
    .reduce((total, expense) => total + expense.amountCents, 0);

  return (
    <section className="feature-page">
      <header className="feature-header">
        <div>
          <span className="eyebrow">Saídas efetivamente pagas</span>
          <h1>Despesas</h1>
          <p>Registre gastos do evento e mantenha cancelamentos preservados na auditoria.</p>
        </div>
        <button
          className="button button--secondary"
          disabled={loading || busy}
          onClick={() => {
            void reload();
          }}
          type="button"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atualizar
        </button>
      </header>

      <div className="summary-grid summary-grid--compact">
        <article className="summary-card summary-card--accent">
          <span>Total ativo</span>
          <strong>{formatMoney(totalCents)}</strong>
        </article>
        <article className="summary-card">
          <span>Pago em dinheiro</span>
          <strong>{formatMoney(cashCents)}</strong>
        </article>
        <article className="summary-card">
          <span>Lançamentos ativos</span>
          <strong>{activeExpenses.length}</strong>
        </article>
        <article className="summary-card">
          <span>Cancelados</span>
          <strong>{cancelledExpenses.length}</strong>
        </article>
      </div>

      {state?.activeEventId === null || state === null ? (
        <div className="inventory-warning">
          <TriangleAlert size={19} aria-hidden="true" />
          <span>Selecione um evento aberto antes de registrar despesas.</span>
        </div>
      ) : null}

      {error === null ? null : <p className="form-error">{error}</p>}
      {message === null ? null : <p className="form-success">{message}</p>}

      {state?.activeEventId !== null && state !== null ? (
        <div className="expense-layout">
          <article className="panel">
            <ExpenseForm busy={busy} onSubmit={createExpense} />
          </article>
          <div className="expense-list" aria-live="polite">
            {loading ? <div className="route-state">Carregando despesas…</div> : null}
            {!loading && expenses.length === 0 ? (
              <div className="empty-state">
                <ReceiptText size={32} aria-hidden="true" />
                <h2>Nenhuma despesa registrada</h2>
                <p>Cadastre a primeira saída financeira do evento.</p>
              </div>
            ) : null}
            {expenses.map((expense) => (
              <ExpenseCard
                busy={busy}
                expense={expense}
                key={expense.id}
                onCancel={cancelExpense}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
