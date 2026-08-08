import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createEvent,
  ensureControlDefaults,
  openDatabase,
  setActiveEvent,
  switchProfile,
} from './index';
import { getPaymentTerminalSettings, updatePaymentTerminalSettings } from './payment-terminal';
import type { DatabaseContext } from './types';

let temporaryDirectory: string | null = null;

async function createTemporaryDatabase(): Promise<DatabaseContext> {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'gtrz-terminal-'));
  const database = openDatabase(path.join(temporaryDirectory, 'terminal.sqlite'));
  ensureControlDefaults(database);
  return database;
}

afterEach(async () => {
  if (temporaryDirectory !== null) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    temporaryDirectory = null;
  }
});

describe('payment terminal settings', () => {
  it('salva taxas por evento sem alterar o schema e isola os valores', async () => {
    const database = await createTemporaryDatabase();
    const firstEvent = createEvent(database, { name: 'Evento A', startsAt: Date.now() });

    expect(getPaymentTerminalSettings(database)).toEqual({
      activeEventId: firstEvent.id,
      debitRateBasisPoints: 0,
      creditRateBasisPoints: 0,
    });

    updatePaymentTerminalSettings(database, {
      debitRateBasisPoints: 269,
      creditRateBasisPoints: 449,
    });
    expect(getPaymentTerminalSettings(database)).toMatchObject({
      debitRateBasisPoints: 269,
      creditRateBasisPoints: 449,
    });

    const secondEvent = createEvent(database, { name: 'Evento B', startsAt: Date.now() + 1 });
    setActiveEvent(database, secondEvent.id);
    expect(getPaymentTerminalSettings(database)).toEqual({
      activeEventId: secondEvent.id,
      debitRateBasisPoints: 0,
      creditRateBasisPoints: 0,
    });

    updatePaymentTerminalSettings(database, {
      debitRateBasisPoints: 300,
      creditRateBasisPoints: 500,
    });
    setActiveEvent(database, firstEvent.id);
    expect(getPaymentTerminalSettings(database)).toMatchObject({
      debitRateBasisPoints: 269,
      creditRateBasisPoints: 449,
    });

    database.close();
  });

  it('impede o Caixa de alterar taxas da maquininha', async () => {
    const database = await createTemporaryDatabase();
    createEvent(database, { name: 'Evento Caixa', startsAt: Date.now() });
    switchProfile(database, 'cashier');

    expect(() =>
      updatePaymentTerminalSettings(database, {
        debitRateBasisPoints: 269,
        creditRateBasisPoints: 449,
      }),
    ).toThrow('Esta operação exige o perfil Produção.');

    database.close();
  });
});
