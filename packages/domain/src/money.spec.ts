import { describe, expect, it } from 'vitest';

import { assertIntegerCents, calculateGrossProfit, calculateMarginPercent } from './money';

describe('money', () => {
  it('calcula lucro bruto em centavos', () => {
    expect(calculateGrossProfit(1_000, 600)).toBe(400);
  });

  it('permite lucro bruto negativo', () => {
    expect(calculateGrossProfit(500, 650)).toBe(-150);
  });

  it('calcula margem sobre o preço de venda', () => {
    expect(calculateMarginPercent(1_000, 600)).toBe(40);
  });

  it('retorna margem zero quando não existe preço de venda válido', () => {
    expect(calculateMarginPercent(0, 600)).toBe(0);
  });

  it('rejeita valores monetários fracionados fora de centavos inteiros', () => {
    expect(() => assertIntegerCents(10.5)).toThrow(TypeError);
  });
});
