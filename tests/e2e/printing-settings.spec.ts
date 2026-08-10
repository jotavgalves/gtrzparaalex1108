import { expect, test } from '@playwright/test';

import {
  closeElectronApplication,
  ensureProduction,
  launchElectronApplication,
} from './electron-app';

test('SMK-PRT-001 — salva impressão automática e largura térmica', async () => {
  test.setTimeout(60_000);
  const electronApplication = await launchElectronApplication();

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await ensureProduction(window);

    await window.getByRole('link', { name: 'Configurações' }).click();
    await expect(window.getByRole('heading', { name: 'Impressora térmica' })).toBeVisible();
    await expect(window.getByLabel('Impressora térmica')).toBeVisible();
    await expect(window.getByLabel('Impressora térmica').locator('option').first()).toHaveText(
      'Padrão do Windows',
    );

    const automatic = window.getByLabel('Imprimir automaticamente após concluir a venda');
    const saveButton = window.getByRole('button', { name: 'Salvar impressão térmica' });
    await expect(automatic).toBeEnabled();
    await expect(saveButton).toBeEnabled();
    await automatic.check();
    await expect(automatic).toBeChecked();
    await window.getByLabel('Largura da bobina').selectOption('58');
    await saveButton.click();
    await expect(window.getByText('Configuração da impressora térmica salva.')).toBeVisible();

    await window.getByRole('link', { name: 'Visão geral' }).click();
    await window.getByRole('link', { name: 'Configurações' }).click();
    await expect(window.getByRole('heading', { name: 'Impressora térmica' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Salvar impressão térmica' })).toBeEnabled();
    await expect(window.getByLabel('Imprimir automaticamente após concluir a venda')).toBeChecked();
    await expect(window.getByLabel('Largura da bobina')).toHaveValue('58');
  } finally {
    await closeElectronApplication(electronApplication);
  }
});
