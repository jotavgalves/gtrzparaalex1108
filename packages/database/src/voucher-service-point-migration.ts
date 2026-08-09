export const voucherServicePointMigration = {
  version: 12,
  name: 'voucher-service-point-bindings',
  sql: `
    CREATE TABLE voucher_service_point_bindings (
      voucher_id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL,
      service_point_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      FOREIGN KEY (service_point_id) REFERENCES service_points(id) ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE INDEX voucher_service_point_bindings_event_point_idx
      ON voucher_service_point_bindings (event_id, service_point_id, updated_at DESC);
  `,
} as const;
