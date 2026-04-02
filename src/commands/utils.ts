import type { Command } from "commander";

export type SignerOptions = {
  ledger?: boolean;
  ledgerPath?: string;
};

export const DEFAULT_LEDGER_PATH = "m/44'/784'/0'/0'/0'";

export function addSignerOptions<T extends Command>(command: T): T {
  return command
    .option("--ledger", "Sign with a connected Ledger device")
    .option(
      "--ledger-path <path>",
      "Ledger derivation path",
      DEFAULT_LEDGER_PATH
    );
}
