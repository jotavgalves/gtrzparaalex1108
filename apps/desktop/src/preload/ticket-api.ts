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
  type CancelTicketSaleInput,
  type CreateTicketLotInput,
  type CreateTicketSaleInput,
  type DeleteTicketLotInput,
  type DeleteTicketSaleInput,
  type TicketApi,
  type TicketLot,
  type TicketLotDeletionResult,
  type TicketSale,
  type TicketSaleDeletionResult,
  type TicketState,
  type UpdateTicketLotInput,
} from '@gtrz/contracts';

import { invoke } from './transport';

export const ticketApi: TicketApi = {
  async getState(): Promise<TicketState> {
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsGetState);
    return ticketStateSchema.parse(payload);
  },

  async createLot(input: CreateTicketLotInput): Promise<TicketLot> {
    const parsedInput = createTicketLotInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsCreateLot, parsedInput);
    return ticketLotSchema.parse(payload);
  },

  async updateLot(input: UpdateTicketLotInput): Promise<TicketLot> {
    const parsedInput = updateTicketLotInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsUpdateLot, parsedInput);
    return ticketLotSchema.parse(payload);
  },

  async deleteLot(input: DeleteTicketLotInput): Promise<TicketLotDeletionResult> {
    const parsedInput = deleteTicketLotInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsDeleteLot, parsedInput);
    return ticketLotDeletionResultSchema.parse(payload);
  },

  async createSale(input: CreateTicketSaleInput): Promise<TicketSale> {
    const parsedInput = createTicketSaleInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsCreateSale, parsedInput);
    return ticketSaleSchema.parse(payload);
  },

  async cancelSale(input: CancelTicketSaleInput): Promise<TicketSale> {
    const parsedInput = cancelTicketSaleInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsCancelSale, parsedInput);
    return ticketSaleSchema.parse(payload);
  },

  async deleteSale(input: DeleteTicketSaleInput): Promise<TicketSaleDeletionResult> {
    const parsedInput = deleteTicketSaleInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.ticketsDeleteSale, parsedInput);
    return ticketSaleDeletionResultSchema.parse(payload);
  },
};
