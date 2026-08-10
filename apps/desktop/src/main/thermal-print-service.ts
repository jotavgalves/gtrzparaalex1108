import { BrowserWindow } from 'electron';

import type {
  PrinterInfo,
  PrintingSettings,
  PrintOrderResult,
  UpdatePrintingSettingsInput,
} from '@gtrz/contracts';
import type { DatabaseContext } from '@gtrz/database';
import {
  getOrderReceipt,
  getPrintingSettings,
  updatePrintingSettings,
} from '@gtrz/database/printing';

import { buildReceiptHtml, estimateReceiptHeightMm } from './receipt-html';

interface ThermalPrintServiceOptions {
  readonly getDatabase: () => DatabaseContext;
}

function createHiddenWindow(): BrowserWindow {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

export class ThermalPrintService {
  readonly #getDatabase: () => DatabaseContext;

  constructor(options: ThermalPrintServiceOptions) {
    this.#getDatabase = options.getDatabase;
  }

  getSettings(): PrintingSettings {
    return getPrintingSettings(this.#getDatabase());
  }

  updateSettings(input: UpdatePrintingSettingsInput): PrintingSettings {
    return updatePrintingSettings(this.#getDatabase(), input);
  }

  async listPrinters(): Promise<readonly PrinterInfo[]> {
    const window = createHiddenWindow();
    try {
      await window.loadURL(
        'data:text/html;charset=utf-8,%3Chtml%3E%3Cbody%3E%3C/body%3E%3C/html%3E',
      );
      const printers = await window.webContents.getPrintersAsync();
      return printers.map((printer) => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        isDefault: false,
      }));
    } finally {
      if (!window.isDestroyed()) window.destroy();
    }
  }

  async printAfterSale(orderId: string): Promise<void> {
    await this.#printOrder(orderId, false).catch(() => undefined);
  }

  async reprintOrder(orderId: string): Promise<PrintOrderResult> {
    return this.#printOrder(orderId, true);
  }

  async #printOrder(orderId: string, force: boolean): Promise<PrintOrderResult> {
    const settings = getPrintingSettings(this.#getDatabase());
    if (!force && !settings.automaticPrinting) {
      return { success: true, skipped: true, message: 'Impressão automática desativada.' };
    }

    try {
      const receipt = getOrderReceipt(this.#getDatabase(), orderId);
      const html = buildReceiptHtml(receipt, settings.paperWidthMm);
      const window = createHiddenWindow();

      try {
        await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        const success = await new Promise<boolean>((resolve) => {
          const printOptions = {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' as const },
            pageSize: {
              width: settings.paperWidthMm * 1000,
              height: estimateReceiptHeightMm(receipt) * 1000,
            },
            ...(settings.deviceName === null ? {} : { deviceName: settings.deviceName }),
          };
          window.webContents.print(printOptions, (printed) => {
            resolve(printed);
          });
        });

        return success
          ? { success: true, skipped: false, message: 'Nota enviada para a impressora.' }
          : {
              success: false,
              skipped: false,
              message: 'A impressora recusou o trabalho de impressão.',
            };
      } finally {
        if (!window.isDestroyed()) window.destroy();
      }
    } catch (error: unknown) {
      return {
        success: false,
        skipped: false,
        message: error instanceof Error ? error.message : 'Falha ao imprimir a nota de retirada.',
      };
    }
  }
}
