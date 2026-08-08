import { expect, test } from '@playwright/test';

import { closeElectronApplication, launchElectronApplication } from './electron-app';

test(
  'SMK-REG-001 — sidebar não rola na horizontal e vouchers respeitam o evento em operação',
  async () => {
    const electronApplication = await launchElectronApplication();

    try {
      const window = await electronApplication.firstWindow();
      await window.waitForLoadState('domcontentloaded');

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
  },
);
