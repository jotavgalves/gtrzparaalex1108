import { expect, test } from '@playwright/test';

import {
  closeElectronApplication,
  ensureProduction,
  launchElectronApplication,
} from './electron-app';

test('SMK-REG-001 — sidebar não rola na horizontal e vouchers respeitam o evento em operação', async () => {
  const electronApplication = await launchElectronApplication();

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await ensureProduction(window);

    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    const sidebarMetrics = await sidebar.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(sidebarMetrics.scrollWidth).toBeLessThanOrEqual(sidebarMetrics.clientWidth);

    const suffix = String(Date.now());
    const eventName = `Evento regressão ${suffix}`;

    await window.getByRole('link', { name: 'Eventos' }).click();
    await window.getByPlaceholder('Ex.: La Rumba Neon — Agosto').fill(eventName);
    await window.getByRole('button', { name: 'Criar evento' }).click();

    const eventCard = window.locator('article.event-card').filter({ hasText: eventName });
    await expect(eventCard).toBeVisible();

    const operateButton = eventCard.getByRole('button', { name: 'Operar evento' });
    if ((await operateButton.count()) > 0) {
      await operateButton.click();
    }
    await expect(eventCard.getByText('Em operação', { exact: true })).toBeVisible();

    await window.getByRole('link', { name: 'Vouchers' }).click();
    await expect(window.getByRole('heading', { name: 'Vouchers', exact: true })).toBeVisible();
    await expect(
      window.getByText('Selecione um evento aberto antes de emitir vouchers.'),
    ).toHaveCount(0);
    await expect(
      window.getByRole('heading', { name: 'Emitir voucher', exact: true }),
    ).toBeVisible();
  } finally {
    await closeElectronApplication(electronApplication);
  }
});

test('SMK-REG-002 — salva taxas da maquininha por evento', async () => {
  const electronApplication = await launchElectronApplication();

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await ensureProduction(window);

    const suffix = String(Date.now());
    const eventName = `Evento maquininha ${suffix}`;

    await window.getByRole('link', { name: 'Eventos' }).click();
    await window.getByPlaceholder('Ex.: La Rumba Neon — Agosto').fill(eventName);
    await window.getByRole('button', { name: 'Criar evento' }).click();

    const eventCard = window.locator('article.event-card').filter({ hasText: eventName });
    await expect(eventCard).toBeVisible();
    const operateButton = eventCard.getByRole('button', { name: 'Operar evento' });
    if ((await operateButton.count()) > 0) {
      await operateButton.click();
    }
    await expect(eventCard.getByText('Em operação', { exact: true })).toBeVisible();

    await window.getByRole('link', { name: 'Configurações' }).click();
    await expect(window.getByRole('heading', { name: 'Maquininha do evento' })).toBeVisible();
    await expect(window.getByText(`Evento em operação: ${eventName}`)).toBeVisible();

    await window.getByLabel('Taxa débito (%)').fill('2.69');
    await window.getByLabel('Taxa crédito (%)').fill('4.49');
    await window.getByRole('button', { name: 'Salvar taxas da maquininha' }).click();
    await expect(window.getByText('Taxas da maquininha salvas para este evento.')).toBeVisible();

    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await ensureProduction(window);
    await window.getByRole('link', { name: 'Configurações' }).click();
    await expect(window.getByLabel('Taxa débito (%)')).toHaveValue('2.69');
    await expect(window.getByLabel('Taxa crédito (%)')).toHaveValue('4.49');
  } finally {
    await closeElectronApplication(electronApplication);
  }
});
