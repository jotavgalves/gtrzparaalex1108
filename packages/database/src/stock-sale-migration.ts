export const stockSaleMigration = {
  version: 12,
  name: 'stock-movements-sale-type',
  sql: `
    ALTER TABLE stock_movements RENAME TO stock_movements_before_sale;

    CREATE TABLE stock_movements (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (
        'purchase', 'correction-positive', 'correction-negative', 'loss', 'breakage',
        'internal-consumption', 'courtesy', 'return', 'sale'
      )),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      delta INTEGER NOT NULL CHECK (delta != 0),
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    INSERT INTO stock_movements (
      id, event_id, product_id, type, quantity, delta, note, created_at
    )
    SELECT id, event_id, product_id, type, quantity, delta, note, created_at
    FROM stock_movements_before_sale;

    DROP TABLE stock_movements_before_sale;

    CREATE INDEX stock_movements_event_created_idx
      ON stock_movements (event_id, created_at DESC);
    CREATE INDEX stock_movements_product_created_idx
      ON stock_movements (product_id, created_at DESC);
  `,
} as const;
