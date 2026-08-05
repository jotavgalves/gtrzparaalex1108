import type { LucideIcon } from 'lucide-react';

interface ModuleMetric {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

interface ModulePageProps {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly metrics: readonly ModuleMetric[];
  readonly nextDeliveries: readonly string[];
}

export function ModulePage({
  title,
  description,
  icon: Icon,
  metrics,
  nextDeliveries,
}: ModulePageProps): React.JSX.Element {
  return (
    <section className="module-page" aria-labelledby="module-title">
      <header className="module-page__header">
        <div className="module-page__title-group">
          <span className="module-page__icon" aria-hidden="true">
            <Icon size={24} strokeWidth={1.8} />
          </span>
          <div>
            <p className="module-page__eyebrow">GTRZ System</p>
            <h1 id="module-title">{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        <span className="status-chip status-chip--foundation">Fundação ativa</span>
      </header>

      <div className="metric-grid" aria-label={`Indicadores de ${title}`}>
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>

      <article className="content-card">
        <div className="content-card__heading">
          <div>
            <span>Próximas entregas</span>
            <h2>Escopo já isolado neste módulo</h2>
          </div>
        </div>
        <ul className="delivery-list">
          {nextDeliveries.map((delivery) => (
            <li key={delivery}>{delivery}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
