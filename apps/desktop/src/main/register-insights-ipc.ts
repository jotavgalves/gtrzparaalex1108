import {
  auditQueryInputSchema,
  auditStateSchema,
  dashboardStateSchema,
  IPC_CHANNELS,
} from '@gtrz/contracts';
import { getAuditState, type DatabaseAuditQuery, type DatabaseContext } from '@gtrz/database';
import { getDashboardStateWithTerminal } from '@gtrz/database/dashboard-terminal';

import type { GtrzRequestRouter } from './request-router';

interface RegisterInsightsIpcOptions {
  readonly getDatabase: () => DatabaseContext;
  readonly router: GtrzRequestRouter;
}

export function registerInsightsIpcHandlers(options: RegisterInsightsIpcOptions): void {
  options.router.register(IPC_CHANNELS.dashboardGetState, () => {
    return dashboardStateSchema.parse(getDashboardStateWithTerminal(options.getDatabase()));
  });

  options.router.register(IPC_CHANNELS.auditList, (payload: unknown) => {
    const input = auditQueryInputSchema.parse(payload ?? {});
    const databaseInput: DatabaseAuditQuery = {
      limit: input.limit,
      ...(input.eventId === undefined ? {} : { eventId: input.eventId }),
      ...(input.profile === undefined ? {} : { profile: input.profile }),
      ...(input.action === undefined ? {} : { action: input.action }),
      ...(input.search === undefined ? {} : { search: input.search }),
      ...(input.from === undefined ? {} : { from: input.from }),
      ...(input.to === undefined ? {} : { to: input.to }),
    };
    return auditStateSchema.parse(getAuditState(options.getDatabase(), databaseInput));
  });
}
