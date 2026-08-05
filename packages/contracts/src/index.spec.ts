import { describe, expect, it } from 'vitest';

import { systemInfoSchema } from './index';

describe('systemInfoSchema', () => {
  it('aceita um estado válido do aplicativo', () => {
    const result = systemInfoSchema.parse({
      appName: 'GTRZ System',
      version: '0.1.0',
      platform: 'win32',
      databaseReady: true,
    });

    expect(result.databaseReady).toBe(true);
  });

  it('rejeita plataformas e estruturas não previstas', () => {
    expect(() =>
      systemInfoSchema.parse({
        appName: 'GTRZ System',
        version: '0.1.0',
        platform: 'android',
        databaseReady: true,
      }),
    ).toThrow();
  });
});
