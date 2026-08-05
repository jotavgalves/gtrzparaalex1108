export function assertIntegerCents(value: number): number {
  if (!Number.isInteger(value)) {
    throw new TypeError('Valores monetários devem ser informados em centavos inteiros.');
  }

  return value;
}

export function calculateGrossProfit(salePriceCents: number, costPriceCents: number): number {
  assertIntegerCents(salePriceCents);
  assertIntegerCents(costPriceCents);
  return salePriceCents - costPriceCents;
}

export function calculateMarginPercent(salePriceCents: number, costPriceCents: number): number {
  assertIntegerCents(salePriceCents);
  assertIntegerCents(costPriceCents);

  if (salePriceCents <= 0) {
    return 0;
  }

  const grossProfitCents = calculateGrossProfit(salePriceCents, costPriceCents);
  return Math.round((grossProfitCents / salePriceCents) * 10_000) / 100;
}
