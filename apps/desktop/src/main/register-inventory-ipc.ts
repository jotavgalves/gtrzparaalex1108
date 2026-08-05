import { ipcMain } from 'electron';

import {
  createCategoryInputSchema,
  createProductInputSchema,
  inventoryProductSchema,
  inventoryStateSchema,
  IPC_CHANNELS,
  productCategorySchema,
  recordStockMovementInputSchema,
  updateProductInputSchema,
} from '@gtrz/contracts';
import {
  createInventoryProduct,
  createProductCategory,
  getInventoryState,
  recordStockMovement,
  updateInventoryProduct,
  type DatabaseContext,
} from '@gtrz/database';

interface RegisterInventoryIpcOptions {
  readonly getDatabase: () => DatabaseContext;
}

const INVENTORY_CHANNELS = [
  IPC_CHANNELS.inventoryGetState,
  IPC_CHANNELS.inventoryCreateCategory,
  IPC_CHANNELS.inventoryCreateProduct,
  IPC_CHANNELS.inventoryUpdateProduct,
  IPC_CHANNELS.inventoryRecordMovement,
] as const;

export function registerInventoryIpcHandlers(options: RegisterInventoryIpcOptions): void {
  for (const channel of INVENTORY_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(IPC_CHANNELS.inventoryGetState, () => {
    return inventoryStateSchema.parse(getInventoryState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.inventoryCreateCategory, (_event, payload: unknown) => {
    const input = createCategoryInputSchema.parse(payload);
    return productCategorySchema.parse(createProductCategory(options.getDatabase(), input.name));
  });

  ipcMain.handle(IPC_CHANNELS.inventoryCreateProduct, (_event, payload: unknown) => {
    const input = createProductInputSchema.parse(payload);
    return inventoryProductSchema.parse(createInventoryProduct(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.inventoryUpdateProduct, (_event, payload: unknown) => {
    const input = updateProductInputSchema.parse(payload);
    return inventoryProductSchema.parse(updateInventoryProduct(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.inventoryRecordMovement, (_event, payload: unknown) => {
    const input = recordStockMovementInputSchema.parse(payload);
    const movementInput =
      input.note === undefined
        ? {
            productId: input.productId,
            type: input.type,
            quantity: input.quantity,
          }
        : {
            productId: input.productId,
            type: input.type,
            quantity: input.quantity,
            note: input.note,
          };

    return inventoryProductSchema.parse(recordStockMovement(options.getDatabase(), movementInput));
  });
}
