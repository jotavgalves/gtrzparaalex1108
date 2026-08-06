import { getCashState } from './cash';
import { getSessionState, listEvents } from './control';
import { getInventoryState } from './inventory';
import { getTicketState } from './tickets';
import type { DatabaseContext } from './types';
import { getVoucherState } from './vouchers';

export type DatabaseInsightProfile = 'production' | 'cashier';

export interface DatabaseInsightAuditRecord {
  readonly id: number;
  readonly eventId: string | null;
  readonly eventName: string | null;
  readonly profile: DatabaseInsightProfile;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly details: Readonly<Record<string, unknown>>;
  readonly createdAt: number;
}

export interface DatabaseDashboardState {
  readonly activeEvent: {
    readonly id: string;
    readonly name: string;
    readonly status: 'open' | 'closed' | 'archived';
    readonly startsAt: number;
  } | null;
  readonly grossSalesCents: number;
  readonly activeExpensesCents: number;
  readonly projectedResultCents: number;
  readonly expectedCashCents: number;
  readonly cashRegisterStatus: 'not-opened' | 'open' | 'closed';
  readonly salesByMethod: {
    readonly cashCents: number;
    readonly pixCents: number;
    readonly creditCardCents: number;
    readonly debitCardCents: number;
    readonly voucherCents: number;
  };
  readonly orders: {
    readonly open: number;
    readonly paid: number;
    readonly cancelled: number;
  };
  readonly tickets: {
    readonly sold: number;
    readonly courtesy: number;
    readonly available: number;
    readonly revenueCents: number;
  };
  readonly vouchers: {
    readonly active: number;
    readonly outstandingBalanceCents: number;
  };
  readonly inventory: {
    readonly units: number;
    readonly activeProducts: number;
    readonly lowStockProducts: number;
    readonly stockCostCents: number;
  };
  readonly recentActivity: readonly DatabaseInsightAuditRecord[];
}

export interface DatabaseAuditQuery {
  readonly eventId?: string | null;
  readonly profile?: DatabaseInsightProfile;
  readonly action?: string;
  readonly search?: string;
  readonly from?: number;
  readonly to?: number;
  readonly limit?: number;
}

export interface DatabaseAuditState {
  readonly records: readonly DatabaseInsightAuditRecord[];
  readonly actions: readonly string[];
  readonly events: readonly { readonly id: string; readonly name: string }[];
}

interface AuditRow {
  readonly id: number;
  readonly event_id: string | null;
  readonly event_name: string | null;
  readonly profile: DatabaseInsightProfile;
  readonly action: string;
  readonly entity_type: string;
  readonly entity_id: string | null;
  readonly details_json: string;
  readonly created_at: number;
}

interface OrderCountRow {
  readonly status: 'open' | 'paid' | 'cancelled';
  readonly amount: number;
}

function requireProduction(database: DatabaseContext): void {
  if (getSessionState(database).profile !== 'production') {
    throw new Error('A visão consolidada e a auditoria exigem o perfil Produção.');
  }
}

function parseDetails(value: string): Readonly<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Readonly<Record<string, unknown>>)
      : {};
  } catch {
    return {};
  }
}

function mapAuditRecord(row: AuditRow): DatabaseInsightAuditRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    profile: row.profile,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: parseDetails(row.details_json),
    createdAt: row.created_at,
  };
}

function listAuditRecords(
  database: DatabaseContext,
  input: DatabaseAuditQuery,
): readonly DatabaseInsightAuditRecord[] {
  const clauses: string[] = [];
  const parameters: unknown[] = [];

  if (input.eventId !== undefined) {
    if (input.eventId === null) {
      clauses.push('al.event_id IS NULL');
    } else {
      clauses.push('al.event_id = ?');
      parameters.push(input.eventId);
    }
  }

  if (input.profile !== undefined) {
    clauses.push('al.profile = ?');
    parameters.push(input.profile);
  }

  const action = input.action?.trim();
  if (action !== undefined && action.length > 0) {
    clauses.push('al.action = ?');
    parameters.push(action);
  }

  const search = input.search?.trim();
  if (search !== undefined && search.length > 0) {
    clauses.push(`(
      al.action LIKE ? COLLATE NOCASE OR
      al.entity_type LIKE ? COLLATE NOCASE OR
      COALESCE(al.entity_id, '') LIKE ? COLLATE NOCASE OR
      al.details_json LIKE ? COLLATE NOCASE OR
      COALESCE(e.name, '') LIKE ? COLLATE NOCASE
    )`);
    const pattern = `%${search}%`;
    parameters.push(pattern, pattern, pattern, pattern, pattern);
  }

  if (input.from !== undefined) {
    clauses.push('al.created_at >= ?');
    parameters.push(input.from);
  }

  if (input.to !== undefined) {
    clauses.push('al.created_at <= ?');
    parameters.push(input.to);
  }

  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  parameters.push(limit);
  const where = clauses.length === 0 ? '' : `WHERE ${clauses.join(' AND ')}`;
  const rows = database.sqlite
    .prepare(
      `SELECT
         al.id,
         al.event_id,
         e.name AS event_name,
         al.profile,
         al.action,
         al.entity_type,
         al.entity_id,
         al.details_json,
         al.created_at
       FROM audit_log al
       LEFT JOIN events e ON e.id = al.event_id
       ${where}
       ORDER BY al.created_at DESC, al.id DESC
       LIMIT ?`,
    )
    .all(...parameters) as AuditRow[];
  return rows.map(mapAuditRecord);
}

function getOrderCounts(
  database: DatabaseContext,
  eventId: string,
): DatabaseDashboardState['orders'] {
  const rows = database.sqlite
    .prepare(
      `SELECT status, COUNT(*) AS amount
       FROM orders
       WHERE event_id = ?
       GROUP BY status`,
    )
    .all(eventId) as OrderCountRow[];
  const result = { open: 0, paid: 0, cancelled: 0 };

  for (const row of rows) {
    result[row.status] = row.amount;
  }

  return result;
}

export function getDashboardState(database: DatabaseContext): DatabaseDashboardState {
  requireProduction(database);
  const session = getSessionState(database);
  const activeEvent = session.activeEvent;
  const cashState = getCashState(database);
  const inventoryState = getInventoryState(database);
  const ticketState = getTicketState(database);
  const voucherState = getVoucherState(database);
  const activeTicketSales = ticketState.sales.filter((sale) => sale.status === 'active');
  const activeVouchers = voucherState.vouchers.filter((voucher) => voucher.status === 'active');

  return {
    activeEvent:
      activeEvent === null
        ? null
        : {
            id: activeEvent.id,
            name: activeEvent.name,
            status: activeEvent.status,
            startsAt: activeEvent.startsAt,
          },
    grossSalesCents: cashState.grossSalesCents,
    activeExpensesCents: cashState.activeExpensesCents,
    projectedResultCents: cashState.projectedResultCents,
    expectedCashCents: cashState.expectedCashCents,
    cashRegisterStatus: cashState.register?.status ?? 'not-opened',
    salesByMethod: cashState.salesByMethod,
    orders:
      activeEvent === null
        ? { open: 0, paid: 0, cancelled: 0 }
        : getOrderCounts(database, activeEvent.id),
    tickets: {
      sold: activeTicketSales
        .filter((sale) => sale.source !== 'courtesy')
        .reduce((total, sale) => total + sale.quantity, 0),
      courtesy: activeTicketSales
        .filter((sale) => sale.source === 'courtesy')
        .reduce((total, sale) => total + sale.quantity, 0),
      available: ticketState.lots
        .filter((lot) => lot.active)
        .reduce((total, lot) => total + lot.availableQuantity, 0),
      revenueCents: ticketState.activeRevenueCents,
    },
    vouchers: {
      active: activeVouchers.length,
      outstandingBalanceCents: activeVouchers.reduce(
        (total, voucher) => total + voucher.remainingBalanceCents,
        0,
      ),
    },
    inventory: {
      units: inventoryState.products.reduce((total, product) => total + product.quantity, 0),
      activeProducts: inventoryState.products.filter((product) => product.active).length,
      lowStockProducts: inventoryState.products.filter(
        (product) => product.active && product.lowStock,
      ).length,
      stockCostCents: inventoryState.products.reduce(
        (total, product) => total + product.quantity * (product.financials?.costCents ?? 0),
        0,
      ),
    },
    recentActivity: listAuditRecords(database, {
      ...(activeEvent === null ? {} : { eventId: activeEvent.id }),
      limit: 8,
    }),
  };
}

export function getAuditState(
  database: DatabaseContext,
  input: DatabaseAuditQuery = {},
): DatabaseAuditState {
  requireProduction(database);
  const actionRows = database.sqlite
    .prepare('SELECT DISTINCT action FROM audit_log ORDER BY action COLLATE NOCASE')
    .all() as { readonly action: string }[];

  return {
    records: listAuditRecords(database, input),
    actions: actionRows.map((row) => row.action),
    events: listEvents(database).map((event) => ({ id: event.id, name: event.name })),
  };
}
