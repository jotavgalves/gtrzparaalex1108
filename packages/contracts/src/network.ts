import { z } from 'zod';

export const networkModeSchema = z.enum(['local', 'host', 'client']);

export const networkStateSchema = z.object({
  mode: networkModeSchema,
  connected: z.boolean(),
  port: z.number().int().min(1).max(65_535),
  remoteUrl: z.url().nullable(),
  hostAddresses: z.array(z.url()),
  lastError: z.string().nullable(),
});

export const connectNetworkInputSchema = z.object({
  host: z.string().trim().min(1).max(255),
});

export type NetworkMode = z.infer<typeof networkModeSchema>;
export type NetworkState = z.infer<typeof networkStateSchema>;
export type ConnectNetworkInput = z.infer<typeof connectNetworkInputSchema>;

export interface NetworkApi {
  getState(): Promise<NetworkState>;
  useLocal(): Promise<NetworkState>;
  startHost(): Promise<NetworkState>;
  connect(input: ConnectNetworkInput): Promise<NetworkState>;
  disconnect(): Promise<NetworkState>;
}
