import { getCashState } from './cash-terminal';
import { getDashboardState, type DatabaseDashboardState } from './insights';
import type { DatabaseContext } from './types';

export function getDashboardStateWithTerminal(database: DatabaseContext): DatabaseDashboardState {
  const dashboard = getDashboardState(database);
  if (dashboard.activeEvent === null) return dashboard;

  const cash = getCashState(database);
  return {
    ...dashboard,
    projectedResultCents: cash.projectedResultCents,
  };
}
