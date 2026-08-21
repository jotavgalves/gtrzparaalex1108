import {
  comboListSchema,
  comboSchema,
  createComboInputSchema,
  IPC_CHANNELS,
  updateComboInputSchema,
} from '@gtrz/contracts';
import { createCombo, listCombos, updateCombo, type DatabaseContext } from '@gtrz/database';

import type { GtrzRequestRouter } from './request-router';

interface RegisterComboIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerComboIpcHandlers(options: RegisterComboIpcOptions): void {
  options.router.register(IPC_CHANNELS.combosList, () => {
    return comboListSchema.parse(listCombos(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.combosCreate, (payload: unknown) => {
    const input = createComboInputSchema.parse(payload);
    return comboSchema.parse(createCombo(options.getDatabase(), input));
  });

  options.router.register(IPC_CHANNELS.combosUpdate, (payload: unknown) => {
    const input = updateComboInputSchema.parse(payload);
    return comboSchema.parse(updateCombo(options.getDatabase(), input));
  });
}
