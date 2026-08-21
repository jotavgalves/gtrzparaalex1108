import {
  createCategoryInputSchema,
  createProductInputSchema,
  deleteProductInputSchema,
  inventoryProductSchema,
  inventoryStateSchema,
  IPC_CHANNELS,
  productCategorySchema,
  productDeletionImpactSchema,
  productDeletionResultSchema,
  recordStockMovementInputSchema,
  stockTransferListSchema,
  stockTransferSchema,
  transferStockInputSchema,
  updateProductInputSchema,
} from '@gtrz/contracts';
import {
  createInventoryProduct,
  createProductCategory,
  getInventoryState,
  listStockTransfers,
  recordStockMovement,
  transferStockBetweenEvents,
  updateInventoryProduct,
  type DatabaseContext,
} from '@gtrz/database';
import {
  deleteInventoryProduct,
  previewProductDeletion,
} from '@gtrz/database/product-administration';

import type { GtrzRequestRouter } from './request-router';

interface RegisterInventoryIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerInventoryIpcHandlers(options: RegisterInventoryIpcOptions): void {
  options.router.register(IPC_CHANNELS.inventoryGetState, () => {
    return inventoryStateSchema.parse(getInventoryState(options.getDatabase()));
  });
  options.router.register(IPC_CHANNELS.inventoryCreateCategory, (payload: unknown) => {
    const input = createCategoryInputSchema.parse(payload);
    return productCategorySchema.parse(createProductCategory(options.getDatabase(), input.name));
  });
  options.router.register(IPC_CHANNELS.inventoryCreateProduct, (payload: unknown) => {
    const input = createProductInputSchema.parse(payload);
    const productInput = {
      categoryId: input.categoryId,
      name: input.name,
      kind: input.kind,
      costCents: input.costCents,
      salePriceCents: input.salePriceCents,
      lowStockThreshold: input.lowStockThreshold,
    };

    if (input.imageDataUrl !== undefined) {
      Object.assign(productInput, { imageDataUrl: input.imageDataUrl });
    }
    if (input.fallbackIcon !== undefined) {
      Object.assign(productInput, { fallbackIcon: input.fallbackIcon });
    }

    return inventoryProductSchema.parse(
      createInventoryProduct(options.getDatabase(), productInput),
    );
  });
  options.router.register(IPC_CHANNELS.inventoryUpdateProduct, (payload: unknown) => {
    const input = updateProductInputSchema.parse(payload);
    const productInput = {
      productId: input.productId,
      active: input.active,
      categoryId: input.categoryId,
      name: input.name,
      kind: input.kind,
      costCents: input.costCents,
      salePriceCents: input.salePriceCents,
      lowStockThreshold: input.lowStockThreshold,
    };

    if (input.imageDataUrl !== undefined) {
      Object.assign(productInput, { imageDataUrl: input.imageDataUrl });
    }
    if (input.fallbackIcon !== undefined) {
      Object.assign(productInput, { fallbackIcon: input.fallbackIcon });
    }

    return inventoryProductSchema.parse(
      updateInventoryProduct(options.getDatabase(), productInput),
    );
  });
  options.router.register(IPC_CHANNELS.inventoryRecordMovement, (payload: unknown) => {
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
  options.router.register(IPC_CHANNELS.inventoryListTransfers, () => {
    return stockTransferListSchema.parse(listStockTransfers(options.getDatabase()));
  });
  options.router.register(IPC_CHANNELS.inventoryTransferStock, (payload: unknown) => {
    const input = transferStockInputSchema.parse(payload);
    const transferInput =
      input.note === undefined
        ? {
            productId: input.productId,
            sourceEventId: input.sourceEventId,
            destinationEventId: input.destinationEventId,
            quantity: input.quantity,
          }
        : {
            productId: input.productId,
            sourceEventId: input.sourceEventId,
            destinationEventId: input.destinationEventId,
            quantity: input.quantity,
            note: input.note,
          };
    return stockTransferSchema.parse(
      transferStockBetweenEvents(options.getDatabase(), transferInput),
    );
  });
  options.router.register(IPC_CHANNELS.inventoryPreviewProductDeletion, (productId: unknown) => {
    return productDeletionImpactSchema.parse(
      previewProductDeletion(options.getDatabase(), String(productId)),
    );
  });
  options.router.register(IPC_CHANNELS.inventoryDeleteProduct, (payload: unknown) => {
    const input = deleteProductInputSchema.parse(payload);
    return productDeletionResultSchema.parse(deleteInventoryProduct(options.getDatabase(), input));
  });
}
