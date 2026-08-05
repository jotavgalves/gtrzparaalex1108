import { z } from 'zod';

export const IPC_CHANNELS = {
  systemGetInfo: 'system:get-info',
} as const;

export const systemInfoSchema = z.object({
  appName: z.literal('GTRZ System'),
  version: z.string().min(1),
  platform: z.enum(['win32', 'linux', 'darwin']),
  databaseReady: z.boolean(),
});

export type SystemInfo = z.infer<typeof systemInfoSchema>;

export interface GtrzDesktopApi {
  readonly system: {
    getInfo(): Promise<SystemInfo>;
  };
}
