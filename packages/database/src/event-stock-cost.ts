import type { DatabaseContext } from './types';

interface StockCostRow {
  readonly cost_cents: number;
  readonly current_units: number;
  readonly consumed_units: number;
}

export function getEventStockCostCents(database: DatabaseContext, eventId: string): number {
  const rows = database.sqlite
    .prepare(
      `SELECT
         p.cost_cents,
         COALESCE((
           SELECT es.quantity
           FROM event_stock es
           WHERE es.event_id = ? AND es.product_id = p.id
         ), 0) AS current_units,
         COALESCE((
           SELECT SUM(
             CASE sm.type
               WHEN 'sale' THEN sm.quantity
               WHEN 'return' THEN -sm.quantity
               WHEN 'loss' THEN sm.quantity
               WHEN 'breakage' THEN sm.quantity
               WHEN 'internal-consumption' THEN sm.quantity
               WHEN 'courtesy' THEN sm.quantity
               ELSE 0
             END
           )
           FROM stock_movements sm
           WHERE sm.event_id = ? AND sm.product_id = p.id
         ), 0) AS consumed_units
       FROM products p
       WHERE EXISTS (
         SELECT 1 FROM event_stock es
         WHERE es.event_id = ? AND es.product_id = p.id
       ) OR EXISTS (
         SELECT 1 FROM stock_movements sm
         WHERE sm.event_id = ? AND sm.product_id = p.id
       )`,
    )
    .all(eventId, eventId, eventId, eventId) as StockCostRow[];

  return rows.reduce((total, row) => {
    const assignedUnits = Math.max(row.current_units + row.consumed_units, 0);
    return total + assignedUnits * row.cost_cents;
  }, 0);
}
