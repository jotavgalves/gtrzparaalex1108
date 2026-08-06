import { z } from 'zod';

export const voucherStatusSchema = z.enum(['active', 'exhausted', 'cancelled']);
export const voucherTransactionTypeSchema = z.enum([
  'issue',
  'redemption',
  'cancellation',
  'reactivation',
  'refund',
]);

export const voucherSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  code: z.string().trim().min(4).max(32),
  label: z.string().trim().min(2).max(100),
  initialBalanceCents: z.number().int().positive(),
  remainingBalanceCents: z.number().int().nonnegative(),
  status: voucherStatusSchema,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const voucherTransactionSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  voucherId: z.uuid(),
  voucherCode: z.string().min(4).max(32),
  orderId: z.uuid().nullable(),
  type: voucherTransactionTypeSchema,
  amountCents: z.number().int().nonnegative(),
  balanceBeforeCents: z.number().int().nonnegative(),
  balanceAfterCents: z.number().int().nonnegative(),
  note: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
});

export const voucherStateSchema = z.object({
  activeEventId: z.uuid().nullable(),
  vouchers: z.array(voucherSchema),
  transactions: z.array(voucherTransactionSchema),
});

export const createVoucherInputSchema = z.object({
  code: z.string().trim().min(4).max(32).optional(),
  label: z.string().trim().min(2).max(100),
  initialBalanceCents: z.number().int().positive(),
});

export const changeVoucherStatusInputSchema = z.object({
  voucherId: z.uuid(),
  status: z.enum(['active', 'cancelled']),
});

export type VoucherStatus = z.infer<typeof voucherStatusSchema>;
export type VoucherTransactionType = z.infer<typeof voucherTransactionTypeSchema>;
export type Voucher = z.infer<typeof voucherSchema>;
export type VoucherTransaction = z.infer<typeof voucherTransactionSchema>;
export type VoucherState = z.infer<typeof voucherStateSchema>;
export type CreateVoucherInput = z.infer<typeof createVoucherInputSchema>;
export type ChangeVoucherStatusInput = z.infer<typeof changeVoucherStatusInputSchema>;

export interface VoucherApi {
  getState(): Promise<VoucherState>;
  create(input: CreateVoucherInput): Promise<Voucher>;
  changeStatus(input: ChangeVoucherStatusInput): Promise<Voucher>;
}
