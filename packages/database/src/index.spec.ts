import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, verifyDatabaseIntegrity } from './index';

let temporaryDirectory: string | null = null;

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('database foundation', () => {
  it('cria o arquivo, aplica migrações e passa na verificação de integridade', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-database-'));
    const databasePath = path.join(temporaryDirectory, 'test.sqlite');
    const database = openDatabase(databasePath);

    expect(verifyDatabaseIntegrity(database)).toBe(true);

    const migrationTable: unknown = database.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();

    expect(migrationTable).toBeDefined();
    database.close();
  });
});
