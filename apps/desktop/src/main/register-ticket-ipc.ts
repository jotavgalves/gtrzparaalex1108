import {
  cancelTicketSaleInputSchema,
  createTicketLotInputSchema,
  createTicketSaleInputSchema,
  deleteTicketLotInputSchema,
  deleteTicketSaleInputSchema,
  IPC_CHANNELS,
  ticketLotDeletionResultSchema,
  ticketLotSchema,
  ticketSaleDeletionResultSchema,
  ticketSaleSchema,
  ticketStateSchema,
  updateTicketLotInputSchema,
} from '@gtrz/contracts';
import {
  cancelTicketSale,
  createTicketLot,
  createTicketSale,
  deleteTicketLot,
  deleteTicketSale,
  getTicketState,
  updateTicketLot,
  type DatabaseContext,
} from '@gtrz/database';

import type { GtrzRequestRouter } from './request-router';

interface RegisterTicketIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerTicketIpcHandlers(options: RegisterTicketIpcOptions): void {
  options.router.register(IPC_CHANNELS.ticketsGetState, () => {
    return ticketStateSchema.parse(getTicketState(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.ticketsCreateLot, (payload: unknown) => {
    const input = createTicketLotInputSchema.parse(payload);
    return ticketLotSchema.parse(createTicketLot(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.ticketsUpdateLot, (payload: unknown) => {
    const input = updateTicketLotInputSchema.parse(payload);
    return ticketLotSchema.parse(updateTicketLot(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.ticketsDeleteLot, (payload: unknown) => {
    const input = deleteTicketLotInputSchema.parse(payload);
    return ticketLotDeletionResultSchema.parse(deleteTicketLot(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.ticketsCreateSale, (payload: unknown) => {
    const input = createTicketSaleInputSchema.parse(payload);
    const databaseInput = {
      lotId: input.lotId,
      attendeeName: input.attendeeName,
      source: input.source,
      quantity: input.quantity,
      ...(input.paymentMethod === undefined ? {} : { paymentMethod: input.paymentMethod }),
      ...(input.manualCodes === undefined ? {} : { manualCodes: input.manualCodes }),
    };
    return ticketSaleSchema.parse(createTicketSale(options.getDatabase(), databaseInput));
  });

  options.router.register(IPC_CHANNELS.ticketsCancelSale, (payload: unknown) => {
    const input = cancelTicketSaleInputSchema.parse(payload);
    return ticketSaleSchema.parse(cancelTicketSale(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.ticketsDeleteSale, (payload: unknown) => {
    const input = deleteTicketSaleInputSchema.parse(payload);
    return ticketSaleDeletionResultSchema.parse(deleteTicketSale(options.getDatabase(), input));
  });
}
