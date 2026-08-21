import {
  IPC_CHANNELS,
  printerListSchema,
  printingSettingsSchema,
  printOrderInputSchema,
  printOrderResultSchema,
  updatePrintingSettingsInputSchema,
} from '@gtrz/contracts';

import type { GtrzRequestRouter } from './request-router';
import type { ThermalPrintService } from './thermal-print-service';

interface RegisterPrintingIpcOptions {
  readonly printService: ThermalPrintService;
  readonly router: GtrzRequestRouter;
}

export function registerPrintingIpcHandlers(options: RegisterPrintingIpcOptions): void {
  options.router.register(IPC_CHANNELS.printingListPrinters, async () => {
    return printerListSchema.parse(await options.printService.listPrinters());
  });

  options.router.register(IPC_CHANNELS.printingGetSettings, () => {
    return printingSettingsSchema.parse(options.printService.getSettings());
  });

  options.router.register(IPC_CHANNELS.printingUpdateSettings, (payload: unknown) => {
    const input = updatePrintingSettingsInputSchema.parse(payload);
    return printingSettingsSchema.parse(options.printService.updateSettings(input));
  });

  options.router.register(IPC_CHANNELS.printingReprintOrder, async (payload: unknown) => {
    const input = printOrderInputSchema.parse(payload);
    return printOrderResultSchema.parse(await options.printService.reprintOrder(input.orderId));
  });
}
