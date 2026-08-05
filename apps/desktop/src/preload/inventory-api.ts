import { ipcRenderer } from 'electron';

import {
  createCategoryInputSchema,
  createProductInputSchema,
  inventoryProductSchema,
  inventoryStateSchema,
  IPC_CHANNELS,
  productCategorySchema,
  recordStockMovementInputSchema,
  updateProductInputSchema,
  type CreateCategoryInput,
  type CreateProductInput,
  type InventoryApi,
  type InventoryProduct,
  type InventoryState,
  type ProductCategory,
  type RecordStockMovementInput,
  type UpdateProductInput,
} from '@gtrz/contracts';

export const inventoryApi: InventoryApi = {
  async getState(): Promise<InventoryState> {
    const payload: unknown = await ipcRenderer.invoke(IPC_CHANNELS.inventoryGetState);
    return inventoryStateSchema.parse(payload);
  },
  async createCategory(input: CreateCategoryInput): Promise<ProductCategory> {
    const parsedInput = createCategoryInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(
      IPC_CHANNELS.inventoryCreateCategory,
      parsedInput,
    );
    return productCategorySchema.parse(payload);
  },
  async createProduct(input: CreateProductInput): Promise<InventoryProduct> {
    const parsedInput = createProductInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(
      IPC_CHANNELS.inventoryCreateProduct,
      parsedInput,
    );
    return inventoryProductSchema.parse(payload);
  },
  async updateProduct(input: UpdateProductInput): Promise<InventoryProduct> {
    const parsedInput = updateProductInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(
      IPC_CHANNELS.inventoryUpdateProduct,
      parsedInput,
    );
    return inventoryProductSchema.parse(payload);
  },
  async recordMovement(input: RecordStockMovementInput): Promise<InventoryProduct> {
    const parsedInput = recordStockMovementInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(
      IPC_CHANNELS.inventoryRecordMovement,
      parsedInput,
    );
    return inventoryProductSchema.parse(payload);
  },
};
