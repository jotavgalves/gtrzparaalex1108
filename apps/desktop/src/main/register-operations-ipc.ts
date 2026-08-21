import {
  addOrderItemInputSchema,
  bindOrderVoucherInputSchema,
  cancelOrderInputSchema,
  closeOrderInputSchema,
  createServicePointInputSchema,
  deleteServicePointInputSchema,
  getOrderInputSchema,
  IPC_CHANNELS,
  openOrderInputSchema,
  operationStateSchema,
  orderSchema,
  removeOrderItemInputSchema,
  renameServicePointInputSchema,
  servicePointSchema,
  servicePointDeletionResultSchema,
  setServicePointPinnedInputSchema,
  startOrderWithItemInputSchema,
  unbindOrderVoucherInputSchema,
} from '@gtrz/contracts';
import {
  addOrderItem,
  bindOrderVoucher,
  cancelOrder,
  closeOrder,
  createServicePoint,
  deleteServicePoint,
  getOperationState,
  getOrder,
  openOrder,
  renameServicePoint,
  removeOrderItem,
  setServicePointPinned,
  startOrderWithItem,
  type DatabaseCloseOrderPaymentInput,
  type DatabaseContext,
  unbindOrderVoucher,
} from '@gtrz/database';

import type { GtrzRequestRouter } from './request-router';

interface RegisterOperationsIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly printAfterSale: (orderId: string) => Promise<void>;
  readonly router: GtrzRequestRouter;
}

function normalizePayment(
  payment: Readonly<{
    method: DatabaseCloseOrderPaymentInput['method'];
    amountCents: number;
    receivedCents?: number | undefined;
  }>,
): DatabaseCloseOrderPaymentInput {
  return payment.receivedCents === undefined
    ? { method: payment.method, amountCents: payment.amountCents }
    : {
        method: payment.method,
        amountCents: payment.amountCents,
        receivedCents: payment.receivedCents,
      };
}

export function registerOperationsIpcHandlers(options: RegisterOperationsIpcOptions): void {
  options.router.register(IPC_CHANNELS.operationsGetState, () => {
    return operationStateSchema.parse(getOperationState(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.operationsCreateServicePoint, (payload: unknown) => {
    const input = createServicePointInputSchema.parse(payload);
    return servicePointSchema.parse(createServicePoint(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsRenameServicePoint, (payload: unknown) => {
    const input = renameServicePointInputSchema.parse(payload);
    return servicePointSchema.parse(renameServicePoint(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsSetServicePointPinned, (payload: unknown) => {
    const input = setServicePointPinnedInputSchema.parse(payload);
    return servicePointSchema.parse(setServicePointPinned(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsDeleteServicePoint, (payload: unknown) => {
    const input = deleteServicePointInputSchema.parse(payload);
    return servicePointDeletionResultSchema.parse(deleteServicePoint(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsOpenOrder, (payload: unknown) => {
    const input = openOrderInputSchema.parse(payload);
    return orderSchema.parse(openOrder(options.getDatabase(), input.servicePointId));
  });

  options.router.register(IPC_CHANNELS.operationsGetOrder, (payload: unknown) => {
    const input = getOrderInputSchema.parse(payload);
    return orderSchema.parse(getOrder(options.getDatabase(), input.orderId));
  });

  options.router.register(IPC_CHANNELS.operationsStartOrderWithItem, (payload: unknown) => {
    const input = startOrderWithItemInputSchema.parse(payload);
    return orderSchema.parse(startOrderWithItem(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsAddItem, (payload: unknown) => {
    const input = addOrderItemInputSchema.parse(payload);
    return orderSchema.parse(addOrderItem(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsRemoveItem, (payload: unknown) => {
    const input = removeOrderItemInputSchema.parse(payload);
    return orderSchema.parse(removeOrderItem(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.operationsBindVoucher, (payload: unknown) => {
    const input = bindOrderVoucherInputSchema.parse(payload);
    bindOrderVoucher(options.getDatabase(), input);
    return orderSchema.parse(getOrder(options.getDatabase(), input.orderId));
  });

  options.router.register(IPC_CHANNELS.operationsUnbindVoucher, (payload: unknown) => {
    const input = unbindOrderVoucherInputSchema.parse(payload);
    unbindOrderVoucher(options.getDatabase(), input.orderId);
    return orderSchema.parse(getOrder(options.getDatabase(), input.orderId));
  });

  options.router.register(IPC_CHANNELS.operationsCloseOrder, (payload: unknown) => {
    const input = closeOrderInputSchema.parse(payload);
    const order = orderSchema.parse(
      closeOrder(options.getDatabase(), {
        orderId: input.orderId,
        discountCents: input.discountCents,
        payments: input.payments.map(normalizePayment),
        voucherUses: input.voucherUses,
      }),
    );
    void options.printAfterSale(order.id);
    return order;
  });

  options.router.register(IPC_CHANNELS.operationsCancelOrder, (payload: unknown) => {
    const input = cancelOrderInputSchema.parse(payload);
    return orderSchema.parse(cancelOrder(options.getDatabase(), input));
  });
}
