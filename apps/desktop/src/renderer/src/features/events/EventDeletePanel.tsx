import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import type { EventDeletionResult } from '@gtrz/contracts';

interface EventDeletePanelProps {
  readonly eventId: string;
  readonly eventName: string;
  readonly onDelete: (
    eventId: string,
    confirmationName: string,
    reason: string,
  ) => Promise<EventDeletionResult>;
  readonly onCancel: () => void;
  readonly onCompleted: (result: EventDeletionResult) => void;
}

export function EventDeletePanel({
  eventId,
  eventName,
  onDelete,
  onCancel,
  onCompleted,
}: EventDeletePanelProps): React.JSX.Element {
  const [confirmationName, setConfirmationName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmationName === eventName && reason.trim().length >= 3;

  async function deleteEvent(): Promise<void> {
    if (!confirmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await onDelete(eventId, confirmationName, reason.trim());
      onCompleted(result);
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir definitivamente o evento.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="event-close-panel" aria-live="polite">
      <header className="event-close-panel__header">
        <div>
          <span className="eyebrow">Zona de exclusão definitiva</span>
          <h2>{eventName}</h2>
          <p>Esta operação ignora pendências operacionais e remove o evento por completo.</p>
        </div>
        <button
          className="button button--ghost button--compact"
          disabled={submitting}
          onClick={onCancel}
          type="button"
        >
          <X size={16} aria-hidden="true" />
          Fechar
        </button>
      </header>

      <div className="event-close-blockers">
        <strong>
          <AlertTriangle size={19} aria-hidden="true" />
          Exclusão irreversível
        </strong>
        <p>
          Comandas abertas ou pagas, vendas, pagamentos, mesas, vouchers, ingressos, caixa,
          despesas, estoque, movimentações e transferências vinculadas a este evento serão removidos
          definitivamente.
        </p>
        <p>Não é necessário encerrar comandas, fechar caixa ou encerrar o evento antes.</p>
      </div>

      <label className="form-field">
        <span>Motivo da exclusão</span>
        <input
          disabled={submitting}
          maxLength={240}
          onChange={(event) => {
            setReason(event.target.value);
          }}
          placeholder="Ex.: evento criado por engano"
          value={reason}
        />
      </label>

      <label className="form-field">
        <span>Digite exatamente o nome do evento</span>
        <input
          autoComplete="off"
          disabled={submitting}
          onChange={(event) => {
            setConfirmationName(event.target.value);
          }}
          placeholder={eventName}
          value={confirmationName}
        />
        <small>
          Confirmação exigida: <strong>{eventName}</strong>
        </small>
      </label>

      {error === null ? null : <p className="form-error">{error}</p>}

      <button
        className="button button--danger"
        disabled={!confirmed || submitting}
        onClick={() => {
          void deleteEvent();
        }}
        type="button"
      >
        <Trash2 size={17} aria-hidden="true" />
        {submitting ? 'Excluindo evento…' : 'Excluir evento definitivamente'}
      </button>
    </section>
  );
}
