import { ipcMain } from 'electron';

import {
  changeVoucherStatusInputSchema,
  createVoucherInputSchema,
  IPC_CHANNELS,
  voucherSchema,
  voucherStateSchema,
} from '@gtrz/contracts';
import {
  changeVoucherStatus,
  createVoucher,
  getVoucherState,
  type DatabaseContext,
} from '@gtrz/database';

interface RegisterVoucherIpcOptions {
  readonly getDatabase: () => DatabaseContext;
}

const VOUCHER_CHANNELS = [
  IPC_CHANNELS.vouchersGetState,
  IPC_CHANNELS.vouchersCreate,
  IPC_CHANNELS.vouchersChangeStatus,
] as const;

export function registerVoucherIpcHandlers(options: RegisterVoucherIpcOptions): void {
  for (const channel of VOUCHER_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(IPC_CHANNELS.vouchersGetState, () => {
    return voucherStateSchema.parse(getVoucherState(options.getDatabase()));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersCreate, (_event, payload: unknown) => {
    const input = createVoucherInputSchema.parse(payload);
    const databaseInput =
      input.code === undefined
        ? { label: input.label, initialBalanceCents: input.initialBalanceCents }
        : {
            code: input.code,
            label: input.label,
            initialBalanceCents: input.initialBalanceCents,
          };
    return voucherSchema.parse(createVoucher(options.getDatabase(), databaseInput));
  });

  ipcMain.handle(IPC_CHANNELS.vouchersChangeStatus, (_event, payload: unknown) => {
    const input = changeVoucherStatusInputSchema.parse(payload);
    return voucherSchema.parse(changeVoucherStatus(options.getDatabase(), input));
  });
}
