import { ipcMain } from 'electron';

import {
  addVoucherBalanceInputSchema,
  changeVoucherStatusInputSchema,
  createVoucherInputSchema,
  deleteVoucherInputSchema,
  deleteVoucherResultSchema,
  IPC_CHANNELS,
  updateVoucherInputSchema,
  voucherSchema,
  voucherStateSchema,
} from '@gtrz/contracts';
import type { DatabaseContext } from '@gtrz/database';
import {
  addManagedVoucherBalance,
  changeManagedVoucherStatus,
  createManagedVoucher,
  deleteManagedVoucher,
  getManagedVoucherState,
  updateManagedVoucher,
} from '@gtrz/database/voucher-management';

interface RegisterVoucherIpcOptions {
  readonly getDatabase: () => DatabaseContext;
}

const VOUCHER_CHANNELS = [
  IPC_CHANNELS.vouchersGetState,
  IPC_CHANNELS.vouchersCreate,
  IPC_CHANNELS.vouchersChangeStatus,
  IPC_CHANNELS.vouchersUpdate,
  IPC_CHANNELS.vouchersAddBalance,
  IPC_CHANNELS.vouchersDelete,
] as const;

export function registerVoucherIpcHandlers(options: RegisterVoucherIpcOptions): void {
  for (const channel of VOUCHER_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(IPC_CHANNELS.vouchersGetState, () => {
    return voucherStateSchema.parse(getManagedVoucherState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersCreate, (_event, payload: unknown) => {
    const input = createVoucherInputSchema.parse(payload);
    return voucherSchema.parse(createManagedVoucher(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersChangeStatus, (_event, payload: unknown) => {
    const input = changeVoucherStatusInputSchema.parse(payload);
    return voucherSchema.parse(changeManagedVoucherStatus(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersUpdate, (_event, payload: unknown) => {
    const input = updateVoucherInputSchema.parse(payload);
    return voucherSchema.parse(updateManagedVoucher(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersAddBalance, (_event, payload: unknown) => {
    const input = addVoucherBalanceInputSchema.parse(payload);
    return voucherSchema.parse(addManagedVoucherBalance(options.getDatabase(), input));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersDelete, (_event, payload: unknown) => {
    const input = deleteVoucherInputSchema.parse(payload);
    return deleteVoucherResultSchema.parse(deleteManagedVoucher(options.getDatabase(), input));
  });
}
