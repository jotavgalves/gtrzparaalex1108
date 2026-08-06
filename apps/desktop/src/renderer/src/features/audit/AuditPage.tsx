import { Filter, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AuditQueryInput, InsightProfile } from '@gtrz/contracts';

import { AuditRecordList } from './AuditRecordList';
import { useAudit } from './useAudit';

function toTimestamp(value: string): number | undefined {
  if (value.length === 0) {
    return undefined;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function AuditPage(): React.JSX.Element {
  const { state, loading, error, load } = useAudit();
  const [search, setSearch] = useState('');
  const [eventId, setEventId] = useState('all');
  const [profile, setProfile] = useState<InsightProfile | 'all'>('all');
  const [action, setAction] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const records = useMemo(() => state?.records ?? [], [state?.records]);

  const applyFilters = async (): Promise<void> => {
    const normalizedSearch = search.trim();
    const fromTimestamp = toTimestamp(from);
    const toTimestampValue = toTimestamp(to);
    const input: AuditQueryInput = {
      limit: 200,
      ...(normalizedSearch.length === 0 ? {} : { search: normalizedSearch }),
      ...(eventId === 'all' ? {} : { eventId }),
      ...(profile === 'all' ? {} : { profile }),
      ...(action === 'all' ? {} : { action }),
      ...(fromTimestamp === undefined ? {} : { from: fromTimestamp }),
      ...(toTimestampValue === undefined ? {} : { to: toTimestampValue }),
    };
    await load(input);
  };

  const clearFilters = async (): Promise<void> => {
    setSearch('');
    setEventId('all');
    setProfile('all');
    setAction('all');
    setFrom('');
    setTo('');
    await load({ limit: 100 });
  };

  return (
    <section className="feature-page">
      <header className="feature-header">
        <div>
          <span className="eyebrow">Trilha imutável de operações</span>
          <h1>Auditoria</h1>
          <p>
            Pesquise criações, alterações, vendas, estornos, estoque, vouchers, ingressos e acessos
            protegidos.
          </p>
        </div>
        <button
          className="button button--secondary"
          disabled={loading}
          onClick={() => {
            void applyFilters();
          }}
          type="button"
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atualizar
        </button>
      </header>

      <div className="summary-grid summary-grid--compact">
        <article className="summary-card summary-card--accent">
          <span>Registros exibidos</span>
          <strong>{records.length}</strong>
          <small>Limite máximo de 200 por consulta</small>
        </article>
        <article className="summary-card">
          <span>Ações catalogadas</span>
          <strong>{state?.actions.length ?? 0}</strong>
          <small>Tipos distintos registrados</small>
        </article>
        <article className="summary-card">
          <span>Eventos disponíveis</span>
          <strong>{state?.events.length ?? 0}</strong>
          <small>Abertos, encerrados e arquivados</small>
        </article>
        <article className="summary-card">
          <span>Integridade</span>
          <strong>Somente leitura</strong>
          <small>Nenhum registro pode ser editado</small>
        </article>
      </div>

      <article className="panel audit-filter-panel">
        <div className="panel__heading">
          <Filter size={20} aria-hidden="true" />
          <div>
            <h2>Filtros</h2>
            <p>Combine critérios para localizar uma operação específica.</p>
          </div>
        </div>

        <form
          className="audit-filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void applyFilters();
          }}
        >
          <label className="form-field audit-search-field">
            <span>Buscar em ação, entidade, evento ou detalhes</span>
            <div className="audit-search-input">
              <Search size={17} aria-hidden="true" />
              <input
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Ex.: estorno, ingresso, nome do evento"
                value={search}
              />
            </div>
          </label>

          <label className="form-field">
            <span>Evento</span>
            <select
              onChange={(event) => {
                setEventId(event.target.value);
              }}
              value={eventId}
            >
              <option value="all">Todos os eventos</option>
              {state?.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Perfil</span>
            <select
              onChange={(event) => {
                setProfile(event.target.value as InsightProfile | 'all');
              }}
              value={profile}
            >
              <option value="all">Todos os perfis</option>
              <option value="production">Produção</option>
              <option value="cashier">Caixa</option>
            </select>
          </label>

          <label className="form-field">
            <span>Ação</span>
            <select
              onChange={(event) => {
                setAction(event.target.value);
              }}
              value={action}
            >
              <option value="all">Todas as ações</option>
              {state?.actions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Data inicial</span>
            <input
              onChange={(event) => {
                setFrom(event.target.value);
              }}
              type="datetime-local"
              value={from}
            />
          </label>

          <label className="form-field">
            <span>Data final</span>
            <input
              onChange={(event) => {
                setTo(event.target.value);
              }}
              type="datetime-local"
              value={to}
            />
          </label>

          <div className="audit-filter-actions">
            <button className="button" disabled={loading} type="submit">
              <ShieldCheck size={17} aria-hidden="true" />
              Aplicar filtros
            </button>
            <button
              className="button button--ghost"
              disabled={loading}
              onClick={() => {
                void clearFilters();
              }}
              type="button"
            >
              <X size={17} aria-hidden="true" />
              Limpar
            </button>
          </div>
        </form>
      </article>

      {error === null ? null : <p className="form-error">{error}</p>}
      {loading && state === null ? <div className="route-state">Carregando auditoria…</div> : null}
      {state === null ? null : <AuditRecordList records={records} />}
    </section>
  );
}
