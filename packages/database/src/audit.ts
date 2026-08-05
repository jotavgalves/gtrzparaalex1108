import { getSessionState } from './control';
import type { DatabaseContext } from './types';

interface AuditInput {
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly eventId?: string | null;
  readonly details?: Readonly<Record<string, unknown>>;
}

export function appendAudit(database: DatabaseContext, input: AuditInput): void {
  database.sqlite
    .prepare(
      `INSERT INTO audit_log
       (event_id, profile, action, entity_type, entity_id, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.eventId ?? null,
      getSessionState(database).profile,
      input.action,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.details ?? {}),
      Date.now(),
    );
}
