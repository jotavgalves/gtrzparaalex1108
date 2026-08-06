import { Braces, Clock3, ShieldCheck } from 'lucide-react';

import type { InsightAuditRecord } from '@gtrz/contracts';

interface AuditRecordListProps {
  readonly records: readonly InsightAuditRecord[];
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(timestamp);
}

function formatDetails(details: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(details);

  if (entries.length === 0) {
    return 'Sem detalhes adicionais.';
  }

  return JSON.stringify(details, null, 2);
}

export function AuditRecordList({ records }: AuditRecordListProps): React.JSX.Element {
  if (records.length === 0) {
    return (
      <div className="empty-state audit-empty">
        <ShieldCheck size={32} aria-hidden="true" />
        <h2>Nenhum registro encontrado</h2>
        <p>Ajuste os filtros ou realize uma operação no sistema.</p>
      </div>
    );
  }

  return (
    <div className="audit-list" aria-live="polite">
      {records.map((record) => (
        <article className="audit-card" key={record.id}>
          <header className="audit-card__header">
            <div>
              <span className={`status-badge status-badge--${record.profile}`}>
                {record.profile === 'production' ? 'Produção' : 'Caixa'}
              </span>
              <h2>{record.action}</h2>
              <p>
                {record.entityType}
                {record.entityId === null ? '' : ` · ${record.entityId}`}
              </p>
            </div>
            <time>
              <Clock3 size={15} aria-hidden="true" />
              {formatDate(record.createdAt)}
            </time>
          </header>

          <div className="audit-card__meta">
            <span>Evento</span>
            <strong>{record.eventName ?? 'Operação global'}</strong>
          </div>

          <details className="audit-details">
            <summary>
              <Braces size={16} aria-hidden="true" />
              Ver detalhes técnicos
            </summary>
            <pre>{formatDetails(record.details)}</pre>
          </details>
        </article>
      ))}
    </div>
  );
}
