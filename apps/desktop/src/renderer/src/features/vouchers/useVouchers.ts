import { useCallback, useEffect, useState } from 'react';

import type { CreateVoucherInput, VoucherState } from '@gtrz/contracts';

interface VoucherViewState {
  readonly state: VoucherState | null;
  readonly loading: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly message: string | null;
  readonly reload: () => Promise<void>;
  readonly createVoucher: (input: CreateVoucherInput) => Promise<void>;
  readonly changeStatus: (voucherId: string, status: 'active' | 'cancelled') => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível atualizar os vouchers.';
}

export function useVouchers(): VoucherViewState {
  const [state, setState] = useState<VoucherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      setState(await window.gtrz.vouchers.getState());
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (operation: () => Promise<unknown>, successMessage: string): Promise<void> => {
      setBusy(true);
      setError(null);
      setMessage(null);

      try {
        await operation();
        await reload();
        setMessage(successMessage);
      } catch (operationError: unknown) {
        setError(getErrorMessage(operationError));
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const createVoucher = useCallback(
    async (input: CreateVoucherInput): Promise<void> => {
      await run(() => window.gtrz.vouchers.create(input), 'Voucher emitido.');
    },
    [run],
  );

  const changeStatus = useCallback(
    async (voucherId: string, status: 'active' | 'cancelled'): Promise<void> => {
      await run(
        () => window.gtrz.vouchers.changeStatus({ voucherId, status }),
        status === 'active' ? 'Voucher reativado.' : 'Voucher cancelado.',
      );
    },
    [run],
  );

  return { state, loading, busy, error, message, reload, createVoucher, changeStatus };
}
