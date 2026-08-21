import {
  comboListSchema,
  comboSchema,
  createComboInputSchema,
  IPC_CHANNELS,
  updateComboInputSchema,
  type ComboApi,
  type CreateComboInput,
  type InventoryCombo,
  type UpdateComboInput,
} from '@gtrz/contracts';

import { invoke } from './transport';

export const comboApi: ComboApi = {
  async list(): Promise<readonly InventoryCombo[]> {
    const payload: unknown = await invoke(IPC_CHANNELS.combosList);
    return comboListSchema.parse(payload);
  },
  async create(input: CreateComboInput): Promise<InventoryCombo> {
    const parsedInput = createComboInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.combosCreate, parsedInput);
    return comboSchema.parse(payload);
  },
  async update(input: UpdateComboInput): Promise<InventoryCombo> {
    const parsedInput = updateComboInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.combosUpdate, parsedInput);
    return comboSchema.parse(payload);
  },
};
