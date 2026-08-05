import path from 'node:path';

import { expect, test } from '@playwright/test';
import { _electron as electron } from 'playwright';

const applicationPath = path.join(process.cwd(), 'apps', 'desktop');

test('SMK-INF-002 — abre o GTRZ System com navegação modular', async () => {
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

test('SMK-USR-001 — Caixa vê somente os módulos permitidos e retorna com senha', async () => {
  const electronApplication = await electron.launch({ args: [applicationPath] });

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await window.getByRole('button', { name: 'Usar perfil Caixa' }).click();
    await expect(window.getByText('Caixa', { exact: true })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Mesas e balcão' })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Estoque' })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Ingressos' })).toHaveCount(0);
    await expect(window.getByRole('link', { name: 'Configurações' })).toHaveCount(0);

    await window.getByPlaceholder('Digite a senha').fill('121225');
    await window.getByRole('button', { name: 'Entrar em Produção' }).click();

    await expect(window.getByText('Produção', { exact: true })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Ingressos' })).toBeVisible();
    await expect(window.getByRole('link', { name: 'Configurações' })).toBeVisible();
  } finally {
    await electronApplication.close();
  }
});

test('SMK-BKP-001 — cria e verifica backup manual pela interface', async () => {
  const electronApplication = await electron.launch({ args: [applicationPath] });

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await window.getByRole('link', { name: 'Backups' }).click();
    await expect(window.getByRole('heading', { name: 'Backups' })).toBeVisible();
    await window.getByRole('button', { name: 'Criar backup' }).click();
    await expect(window.getByText(/criado e verificado/u)).toBeVisible();

    const verifyButton = window.getByRole('button', { name: 'Verificar' }).first();
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();
    await expect(window.getByText(/está íntegro/u)).toBeVisible();
  } finally {
    await electronApplication.close();
  }
});
