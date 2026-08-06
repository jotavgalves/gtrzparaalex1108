import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';

const applicationPath = path.join(process.cwd(), 'apps', 'desktop');

async function ensureProduction(window: Page): Promise<void> {
  if (await window.getByText('Caixa', { exact: true }).isVisible()) {
    await window.getByPlaceholder('Digite a senha').fill('121225');
    await window.getByRole('button', { name: 'Entrar em Produção' }).click();
    await expect(window.getByText('Produção', { exact: true })).toBeVisible();
  }
}

test('SMK-VCH-001 — usa voucher parcial e restitui saldo no estorno', async () => {
  const electronApplication = await electron.launch({ args: [applicationPath] });

  try {
    const window = await electronApplication.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await ensureProduction(window);
    const suffix = String(Date.now());
    const eventName = `Evento voucher ${suffix}`;
    const categoryName = `Categoria voucher ${suffix}`;
    const productName = `Produto voucher ${suffix}`;
    const voucherCode = `VCH-${suffix.slice(-8)}`;

    await window.getByRole('link', { name: 'Eventos' }).click();
    await window.getByPlaceholder('Ex.: La Rumba Neon — Agosto').fill(eventName);
    await window.getByRole('button', { name: 'Criar evento' }).click();
    await expect(window.getByText(eventName, { exact: true }).first()).toBeVisible();

    await window.getByRole('link', { name: 'Estoque' }).click();
    await window.getByPlaceholder('Ex.: Cervejas').fill(categoryName);
    await window.getByRole('button', { name: 'Criar categoria' }).click();
    const productForm = window.locator('form.product-form');
    await productForm.getByLabel('Nome', { exact: true }).fill(productName);
    await productForm.getByRole('combobox').first().selectOption({ label: categoryName });
    await productForm.getByLabel('Preço de custo', { exact: true }).fill('2.00');
    await productForm.getByLabel('Preço de venda', { exact: true }).fill('10.00');
    await productForm.getByLabel('Aviso de estoque baixo', { exact: true }).fill('1');
    await productForm.getByRole('button', { name: 'Cadastrar produto' }).click();
    const productCard = window.locator('article.inventory-card').filter({ hasText: productName });
    await productCard.getByRole('button', { name: 'Movimentar' }).click();
    const movementForm = window.locator('form.movement-form');
    await movementForm.getByLabel('Quantidade', { exact: true }).fill('3');
    await movementForm.getByRole('button', { name: 'Registrar movimento' }).click();
    await expect(productCard.getByText('3 un.', { exact: true })).toBeVisible();

    await window.getByRole('link', { name: 'Vouchers' }).click();
    await window.getByPlaceholder('Ex.: Crédito patrocinador').fill(`Crédito ${suffix}`);
    await window.getByPlaceholder('Gerado automaticamente').fill(voucherCode);
    await window.getByPlaceholder('100,00').fill('10.00');
    await window.getByRole('button', { name: 'Emitir voucher' }).click();
    let voucherCard = window.locator('article.voucher-card').filter({ hasText: voucherCode });
    await expect(voucherCard).toContainText('R$ 10,00');

    await window.getByRole('link', { name: 'Mesas e balcão' }).click();
    await window.getByRole('button', { name: /Balcão/u }).click();
    await window.getByRole('button', { name: new RegExp(productName, 'u') }).click();
    await window.getByPlaceholder('GTRZ-XXXXXXXX').fill(voucherCode);
    await window.getByLabel('Valor do voucher').fill('4.00');
    await window.getByLabel('Valor do pagamento 1').fill('6.00');
    await window.getByLabel('Valor recebido 1').fill('10.00');
    await window.getByRole('button', { name: 'Concluir venda' }).click();
    await expect(window.getByText('Venda concluída e estoque atualizado.')).toBeVisible();

    await window.getByRole('link', { name: 'Vouchers' }).click();
    voucherCard = window.locator('article.voucher-card').filter({ hasText: voucherCode });
    await expect(voucherCard).toContainText('R$ 6,00');

    await window.getByRole('link', { name: 'Mesas e balcão' }).click();
    const recentOrder = window
      .locator('article.recent-order-card')
      .filter({ hasText: productName });
    await expect(recentOrder).toContainText('Paga');
    await recentOrder.getByPlaceholder('Ex.: lançamento duplicado').fill('Estorno voucher');
    await recentOrder.getByRole('button', { name: 'Estornar venda' }).click();
    await expect(window.getByText('Comanda cancelada e operação auditada.')).toBeVisible();

    await window.getByRole('link', { name: 'Vouchers' }).click();
    voucherCard = window.locator('article.voucher-card').filter({ hasText: voucherCode });
    await expect(voucherCard).toContainText('R$ 10,00');
  } finally {
    await electronApplication.close();
  }
});
