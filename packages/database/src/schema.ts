import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(),
  name: text('name').notNull(),
  appliedAt: integer('applied_at', { mode: 'timestamp_ms' }).notNull(),
});

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', { enum: ['open', 'closed', 'archived'] }).notNull(),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id')
    .notNull()
    .references(() => productCategories.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['food', 'drink'] }).notNull(),
  costCents: integer('cost_cents').notNull(),
  salePriceCents: integer('sale_price_cents').notNull(),
  lowStockThreshold: integer('low_stock_threshold').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const eventStock = sqliteTable(
  'event_stock',
  {
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    quantity: integer('quantity').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.productId] })],
);

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
  type: text('type', {
    enum: [
      'purchase',
      'correction-positive',
      'correction-negative',
      'loss',
      'breakage',
      'internal-consumption',
      'courtesy',
      'return',
    ],
  }).notNull(),
  quantity: integer('quantity').notNull(),
  delta: integer('delta').notNull(),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: text('event_id'),
  profile: text('profile', { enum: ['production', 'cashier'] }).notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  detailsJson: text('details_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const technicalSchema = {
  appMeta,
  auditLog,
  eventStock,
  events,
  productCategories,
  products,
  schemaMigrations,
  stockMovements,
};
