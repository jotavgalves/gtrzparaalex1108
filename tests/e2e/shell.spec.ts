import path from 'node:path';

import { expect, test } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('SMK-INF-002 — abre o GTRZ System com navegação modular', async () => {
  const applicationPath = path.join(process.cwd(), 'apps', 'desktop');
  const electronApplication = await electron.launch({ args: [applicationPath] });

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(window).toHaveTitle('GTRZ System');
    await expect(window.locator('#root')).not.toBeEmpty();

    const bodyText = await window.locator('body').innerText();
    expect(bodyText).toContain('GTRZ');
    expect(bodyText).not.toContain('Falha ao abrir esta área');

    await expect(window.getByRole('navigation', { name: 'Módulos do sistema' })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Estoque' })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Mesas e balcão' })).toBeVisible();
    await expect(window.getByText('Banco íntegro')).toBeVisible();
  } finally {
    await electronApplication.close();
  }
});
