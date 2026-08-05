import { z } from 'zod';

export const productKindSchema = z.enum(['food', 'drink']);
export const stockMovementTypeSchema = z.enum([
  'purchase',
  'correction-positive',
  'correction-negative',
  'loss',
  'breakage',
  'internal-consumption',
  'courtesy',
  'return',
]);

export const productCategorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(60),
  active: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const productFinancialsSchema = z.object({
  costCents: z.number().int().nonnegative(),
  grossProfitCents: z.number().int(),
  marginPercent: z.number(),
});

export const inventoryProductSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  categoryName: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  kind: productKindSchema,
  salePriceCents: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  active: z.boolean(),
  quantity: z.number().int().nonnegative(),
  lowStock: z.boolean(),
  financials: productFinancialsSchema.nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const inventoryStateSchema = z.object({
  activeEventId: z.uuid().nullable(),
  categories: z.array(productCategorySchema),
  products: z.array(inventoryProductSchema),
});

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export const createProductInputSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  kind: productKindSchema,
  costCents: z.number().int().nonnegative(),
  salePriceCents: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
});

export const updateProductInputSchema = createProductInputSchema.extend({
  productId: z.uuid(),
  active: z.boolean(),
});

export const recordStockMovementInputSchema = z.object({
  productId: z.uuid(),
  type: stockMovementTypeSchema,
  quantity: z.number().int().positive(),
  note: z.string().trim().max(240).optional(),
});

export type ProductKind = z.infer<typeof productKindSchema>;
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type ProductCategory = z.infer<typeof productCategorySchema>;
export type ProductFinancials = z.infer<typeof productFinancialsSchema>;
export type InventoryProduct = z.infer<typeof inventoryProductSchema>;
export type InventoryState = z.infer<typeof inventoryStateSchema>;
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type RecordStockMovementInput = z.infer<typeof recordStockMovementInputSchema>;

export interface InventoryApi {
  getState(): Promise<InventoryState>;
  createCategory(input: CreateCategoryInput): Promise<ProductCategory>;
  createProduct(input: CreateProductInput): Promise<InventoryProduct>;
  updateProduct(input: UpdateProductInput): Promise<InventoryProduct>;
  recordMovement(input: RecordStockMovementInput): Promise<InventoryProduct>;
}
