import { getSessionState } from './control';
import type { DatabaseContext } from './types';

export interface DatabaseVoucherServicePoint {
  readonly id: string;
  readonly label: string;
}

export interface DatabaseVoucherServicePointBinding {
  readonly servicePointId: string;
  readonly servicePointLabel: string;
  readonly active: boolean;
}

interface ServicePointRow {
  readonly id: string;
  readonly event_id: string;
  readonly label: string;
  readonly type: 'table' | 'counter';
  readonly active: number;
}

function bindingKey(voucherId: string): string {
  return `voucher.service-point:${voucherId}`;
}

function getServicePoint(
  database: DatabaseContext,
  servicePointId: string,
): ServicePointRow | null {
  const row = database.sqlite
    .prepare(
      `SELECT id, event_id, label, type, active
       FROM service_points
       WHERE id = ?`,
    )
    .get(servicePointId) as ServicePointRow | undefined;
  return row ?? null;
}

export function listVoucherServicePoints(
  database: DatabaseContext,
  eventId: string,
): readonly DatabaseVoucherServicePoint[] {
  const rows = database.sqlite
    .prepare(
      `SELECT id, label
       FROM service_points
       WHERE event_id = ? AND type = 'table' AND active = 1
       ORDER BY label COLLATE NOCASE`,
    )
    .all(eventId) as { readonly id: string; readonly label: string }[];
  return rows;
}

export function getVoucherServicePointBinding(
  database: DatabaseContext,
  voucherId: string,
): DatabaseVoucherServicePointBinding | null {
  const row = database.sqlite
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(bindingKey(voucherId)) as { readonly value: string } | undefined;

  if (row === undefined) {
    return null;
  }

  const servicePoint = getServicePoint(database, row.value);
  if (servicePoint?.type !== 'table') {
    return null;
  }

  return {
    servicePointId: servicePoint.id,
    servicePointLabel: servicePoint.label,
    active: servicePoint.active === 1,
  };
}

export function setVoucherServicePointBinding(
  database: DatabaseContext,
  input: { readonly voucherId: string; readonly eventId: string; readonly servicePointId: string },
): DatabaseVoucherServicePointBinding {
  const target = getServicePoint(database, input.servicePointId);

  if (
    target?.event_id !== input.eventId ||
    target.type !== 'table' ||
    target.active !== 1
  ) {
    throw new Error('Selecione uma mesa ativa do evento para vincular o voucher.');
  }

  const current = getVoucherServicePointBinding(database, input.voucherId);
  if (current?.servicePointId !== undefined && current.servicePointId !== target.id && current.active) {
    throw new Error(
      `Este voucher permanece vinculado a ${current.servicePointLabel} enquanto essa mesa existir.`,
    );
  }

  database.sqlite
    .prepare(
      `INSERT INTO app_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(bindingKey(input.voucherId), target.id, Date.now());

  return {
    servicePointId: target.id,
    servicePointLabel: target.label,
    active: true,
  };
}

export function clearVoucherServicePointBinding(
  database: DatabaseContext,
  voucherId: string,
): void {
  database.sqlite.prepare('DELETE FROM app_meta WHERE key = ?').run(bindingKey(voucherId));
}

export function requireVoucherServicePointForOrder(
  database: DatabaseContext,
  input: {
    readonly voucherId: string;
    readonly eventId: string;
    readonly servicePointId: string;
    readonly servicePointLabel: string;
  },
): DatabaseVoucherServicePointBinding {
  const binding = getVoucherServicePointBinding(database, input.voucherId);

  if (binding === null) {
    throw new Error('Este voucher ainda não possui uma mesa vinculada. Vincule-o em Vouchers.');
  }

  if (!binding.active) {
    throw new Error(
      'A mesa original deste voucher foi excluída. Reassocie o voucher antes de usá-lo.',
    );
  }

  if (binding.servicePointId !== input.servicePointId) {
    throw new Error(
      `O voucher só pode ser utilizado em ${binding.servicePointLabel}, não em ${input.servicePointLabel}.`,
    );
  }

  const activeEventId = getSessionState(database).activeEvent?.id ?? null;
  if (activeEventId !== input.eventId) {
    throw new Error('O voucher não pertence ao evento em operação.');
  }

  return binding;
}
