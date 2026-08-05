import BetterSqlite3 from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { technicalSchema } from './schema';

interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'technical-foundation',
    sql: `
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `,
  },
];

export interface DatabaseContext {
  readonly sqlite: BetterSqlite3.Database;
  readonly orm: BetterSQLite3Database<typeof technicalSchema>;
  readonly filePath: string;
  close(): void;
}

function ensureMigrationTable(sqlite: BetterSqlite3.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

function applyMigrations(sqlite: BetterSqlite3.Database): void {
  ensureMigrationTable(sqlite);

  const hasMigration = sqlite.prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
  const registerMigration = sqlite.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );

  const migrate = sqlite.transaction(() => {
    for (const migration of migrations) {
      if (hasMigration.get(migration.version) !== undefined) {
        continue;
      }

      sqlite.exec(migration.sql);
      registerMigration.run(migration.version, migration.name, Date.now());
    }
  });

  migrate();
}

export function openDatabase(filePath: string): DatabaseContext {
  const sqlite = new BetterSqlite3(filePath);

  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  applyMigrations(sqlite);

  const orm = drizzle(sqlite, { schema: technicalSchema });

  return {
    sqlite,
    orm,
    filePath,
    close(): void {
      if (sqlite.open) {
        sqlite.close();
      }
    },
  };
}

export function verifyDatabaseIntegrity(database: DatabaseContext): boolean {
  const result = database.sqlite.pragma('quick_check', { simple: true });
  return result === 'ok';
}
