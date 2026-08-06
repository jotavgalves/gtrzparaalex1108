import { ipcRenderer } from 'electron';

import {
  changeVoucherStatusInputSchema,
  createVoucherInputSchema,
  IPC_CHANNELS,
  voucherSchema,
  voucherStateSchema,
  type ChangeVoucherStatusInput,
  type CreateVoucherInput,
  type Voucher,
  type VoucherApi,
  type VoucherState,
} from '@gtrz/contracts';

export const voucherApi: VoucherApi = {
  async getState(): Promise<VoucherState> {
    const payload: unknown = await ipcRenderer.invoke(IPC_CHANNELS.vouchersGetState);
    return voucherStateSchema.parse(payload);
  },

  async create(input: CreateVoucherInput): Promise<Voucher> {
    const parsedInput = createVoucherInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(IPC_CHANNELS.vouchersCreate, parsedInput);
    return voucherSchema.parse(payload);
  },

  async changeStatus(input: ChangeVoucherStatusInput): Promise<Voucher> {
    const parsedInput = changeVoucherStatusInputSchema.parse(input);
    const payload: unknown = await ipcRenderer.invoke(
      IPC_CHANNELS.vouchersChangeStatus,
      parsedInput,
    );
    return voucherSchema.parse(payload);
  },
};
