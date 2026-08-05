import { z } from 'zod';

export const IPC_CHANNELS = {
  systemGetInfo: 'system:get-info',
  eventsList: 'events:list',
  eventsCreate: 'events:create',
  eventsRename: 'events:rename',
  eventsChangeStatus: 'events:change-status',
  eventsSetActive: 'events:set-active',
  sessionGetState: 'session:get-state',
  sessionSwitchProfile: 'session:switch-profile',
  settingsChangeProductionPassword: 'settings:change-production-password',
} as const;

export const systemInfoSchema = z.object({
  appName: z.literal('GTRZ System'),
  version: z.string().min(1),
  platform: z.enum(['win32', 'linux', 'darwin']),
  databaseReady: z.boolean(),
});

export const userProfileSchema = z.enum(['production', 'cashier']);
export const eventStatusSchema = z.enum(['open', 'closed', 'archived']);

export const eventSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(100),
  status: eventStatusSchema,
  startsAt: z.number().int().nonnegative(),
  endsAt: z.number().int().nonnegative().nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const eventListSchema = z.array(eventSchema);

export const createEventInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  startsAt: z.number().int().nonnegative(),
});

export const renameEventInputSchema = z.object({
  eventId: z.uuid(),
  name: z.string().trim().min(2).max(100),
});

export const changeEventStatusInputSchema = z.object({
  eventId: z.uuid(),
  status: eventStatusSchema,
});

export const setActiveEventInputSchema = z.object({
  eventId: z.uuid().nullable(),
});

export const sessionStateSchema = z.object({
  profile: userProfileSchema,
  activeEvent: eventSchema.nullable(),
});

export const switchProfileInputSchema = z.object({
  targetProfile: userProfileSchema,
  password: z.string().max(128).optional(),
});

export const changeProductionPasswordInputSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});

export const operationResultSchema = z.object({
  success: z.literal(true),
});

export type SystemInfo = z.infer<typeof systemInfoSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type EventStatus = z.infer<typeof eventStatusSchema>;
export type GtrzEvent = z.infer<typeof eventSchema>;
export type CreateEventInput = z.infer<typeof createEventInputSchema>;
export type RenameEventInput = z.infer<typeof renameEventInputSchema>;
export type ChangeEventStatusInput = z.infer<typeof changeEventStatusInputSchema>;
export type SetActiveEventInput = z.infer<typeof setActiveEventInputSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type SwitchProfileInput = z.infer<typeof switchProfileInputSchema>;
export type ChangeProductionPasswordInput = z.infer<typeof changeProductionPasswordInputSchema>;
export type OperationResult = z.infer<typeof operationResultSchema>;

export interface GtrzDesktopApi {
  readonly system: {
    getInfo(): Promise<SystemInfo>;
  };
  readonly events: {
    list(): Promise<readonly GtrzEvent[]>;
    create(input: CreateEventInput): Promise<GtrzEvent>;
    rename(input: RenameEventInput): Promise<GtrzEvent>;
    changeStatus(input: ChangeEventStatusInput): Promise<GtrzEvent>;
    setActive(input: SetActiveEventInput): Promise<SessionState>;
  };
  readonly session: {
    getState(): Promise<SessionState>;
    switchProfile(input: SwitchProfileInput): Promise<SessionState>;
  };
  readonly settings: {
    changeProductionPassword(input: ChangeProductionPasswordInput): Promise<OperationResult>;
  };
}
