import {
  connectNetworkInputSchema,
  IPC_CHANNELS,
  networkStateSchema,
  type ConnectNetworkInput,
  type NetworkApi,
  type NetworkState,
} from '@gtrz/contracts';

import { invoke } from './transport';

export const networkApi: NetworkApi = {
  async getState(): Promise<NetworkState> {
    const payload: unknown = await invoke(IPC_CHANNELS.networkGetState);
    return networkStateSchema.parse(payload);
  },

  async useLocal(): Promise<NetworkState> {
    const payload: unknown = await invoke(IPC_CHANNELS.networkUseLocal);
    return networkStateSchema.parse(payload);
  },

  async startHost(): Promise<NetworkState> {
    const payload: unknown = await invoke(IPC_CHANNELS.networkStartHost);
    return networkStateSchema.parse(payload);
  },

  async connect(input: ConnectNetworkInput): Promise<NetworkState> {
    const parsedInput = connectNetworkInputSchema.parse(input);
    const payload: unknown = await invoke(IPC_CHANNELS.networkConnect, parsedInput);
    return networkStateSchema.parse(payload);
  },

  async disconnect(): Promise<NetworkState> {
    const payload: unknown = await invoke(IPC_CHANNELS.networkDisconnect);
    return networkStateSchema.parse(payload);
  },
};
