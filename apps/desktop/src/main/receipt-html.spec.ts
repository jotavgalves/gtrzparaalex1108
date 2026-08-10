import { describe, expect, it } from 'vitest';

import type { DatabaseOrderReceipt } from '@gtrz/database/printing';

import { buildReceiptHtml, estimateReceiptHeightMm } from './receipt-html';

const receipt: DatabaseOrderReceipt = {
  orderId: '85ffbb3f-6d4c-43d3-b615-e437fd5d88f4',
  eventName: 'La Rumba Teste',
  servicePointLabel: 'Mesa 12',
  servicePointType: 'table',
  subtotalCents: 2000,
  discountCents: 200,
  totalCents: 1800,
  closedAt: 1_786_000_000_000,
  items: [
    {
      name: 'Budweiser',
      quantity: 2,
      unitPriceCents: 1000,
      totalCents: 2000,
    },
  ],
  payments: [
    {
      method: 'cash',
      amountCents: 1300,
      receivedCents: 1500,
      changeCents: 200,
    },
  ],
  vouchers: [{ code: 'VIP-001', amountCents: 500 }],
};

describe('thermal receipt html', () => {
  it('inclui retirada, venda, mesa, itens, pagamento, voucher e troco', () => {
    const html = buildReceiptHtml(receipt, 58);

    expect(html).toContain('width: 58mm');
    expect(html).toContain('GTRZ SYSTEM');
    expect(html).toContain('NOTA DE RETIRADA');
    expect(html).toContain('La Rumba Teste');
    expect(html).toContain('Mesa: <strong>Mesa 12</strong>');
    expect(html).toContain('2× Budweiser');
    expect(html).toContain('Dinheiro');
    expect(html).toContain('Troco');
    expect(html).toContain('Voucher VIP-001');
    expect(html).toContain('APRESENTE ESTA NOTA NO BAR PARA RETIRAR OS ITENS');
    expect(html).toContain('Válida somente durante o evento.');
    expect(html).toContain('Venda 85FFBB3F');
  });

  it('dimensiona a altura conforme o conteúdo com limites seguros', () => {
    expect(estimateReceiptHeightMm(receipt)).toBeGreaterThanOrEqual(140);
    expect(estimateReceiptHeightMm(receipt)).toBeLessThanOrEqual(700);
  });
});
