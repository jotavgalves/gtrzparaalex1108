export const expensePaymentStatusMigration = {
  version: 13,
  name: 'expense-payment-status',
  sql: `
    ALTER TABLE expenses
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'open'
      CHECK (payment_status IN ('open', 'partial', 'paid'));
  `,
} as const;
