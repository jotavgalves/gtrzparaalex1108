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

import type { GtrzRequestRouter } from './request-router';

interface RegisterVoucherIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerVoucherIpcHandlers(options: RegisterVoucherIpcOptions): void {
  options.router.register(IPC_CHANNELS.vouchersGetState, () => {
    return voucherStateSchema.parse(getManagedVoucherState(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.vouchersCreate, (payload: unknown) => {
    const input = createVoucherInputSchema.parse(payload);
    const databaseInput =
      input.code === undefined
        ? {
            label: input.label,
            initialBalanceCents: input.initialBalanceCents,
            servicePointId: input.servicePointId,
          }
        : {
            code: input.code,
            label: input.label,
            initialBalanceCents: input.initialBalanceCents,
            servicePointId: input.servicePointId,
          };
    return voucherSchema.parse(createManagedVoucher(options.getDatabase(), databaseInput));
  });

  options.router.register(IPC_CHANNELS.vouchersChangeStatus, (payload: unknown) => {
    const input = changeVoucherStatusInputSchema.parse(payload);
    return voucherSchema.parse(changeManagedVoucherStatus(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.vouchersUpdate, (payload: unknown) => {
    const input = updateVoucherInputSchema.parse(payload);
    return voucherSchema.parse(updateManagedVoucher(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.vouchersAddBalance, (payload: unknown) => {
    const input = addVoucherBalanceInputSchema.parse(payload);
    return voucherSchema.parse(addManagedVoucherBalance(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.vouchersDelete, (payload: unknown) => {
    const input = deleteVoucherInputSchema.parse(payload);
    return deleteVoucherResultSchema.parse(deleteManagedVoucher(options.getDatabase(), input));
  });
}
