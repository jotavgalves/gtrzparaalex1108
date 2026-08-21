import {
  connectNetworkInputSchema,
  IPC_CHANNELS,
  networkStateSchema,
} from '@gtrz/contracts';

import type { NetworkService } from './network-service';
import type { GtrzRequestRouter } from './request-router';

interface RegisterNetworkIpcOptions {
  readonly networkService: NetworkService;
  readonly router: GtrzRequestRouter;
}

export function registerNetworkIpcHandlers(options: RegisterNetworkIpcOptions): void {
  options.router.register(IPC_CHANNELS.networkGetState, async () => {
    return networkStateSchema.parse(await options.networkService.getState());
  });

  options.router.register(IPC_CHANNELS.networkUseLocal, async () => {
    return networkStateSchema.parse(await options.networkService.useLocal());
  });

  options.router.register(IPC_CHANNELS.networkStartHost, async () => {
    return networkStateSchema.parse(await options.networkService.startHost());
  });

  options.router.register(IPC_CHANNELS.networkConnect, async (payload: unknown) => {
    const input = connectNetworkInputSchema.parse(payload);
    return networkStateSchema.parse(await options.networkService.connect(input.host));
  });

  options.router.register(IPC_CHANNELS.networkDisconnect, async () => {
    return networkStateSchema.parse(await options.networkService.disconnect());
  });
}
