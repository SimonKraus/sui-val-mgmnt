import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import type { TransactionResult } from "@mysten/sui/transactions";
import { bcs } from "@mysten/bcs";
import type { SignerOptions } from "./commands/utils.js";

export function getBaseEnv() {
  return cleanEnv(process.env, {
    SUI_RPC_URL: str(),
  });
}

export function createSuiClient(rpcUrl: string) {
  return new SuiClient({ url: rpcUrl });
}

export function createKeypair(privateKey: string) {
  return Ed25519Keypair.fromSecretKey(privateKey);
}

export function getSignerOptionsFromArgv(argv = process.argv.slice(2)): SignerOptions {
  const ledger = argv.includes("--ledger");
  const ledgerPathArg = argv.find((arg) => arg.startsWith("--ledger-path="));
  const ledgerPathIndex = argv.indexOf("--ledger-path");
  const ledgerPath =
    ledgerPathArg?.slice("--ledger-path=".length) ??
    (ledgerPathIndex >= 0 ? argv[ledgerPathIndex + 1] : undefined);

  return {
    ledger,
    ledgerPath,
  };
}

export async function createSigner({
  client,
  ledger,
  ledgerPath,
}: SignerOptions & { client?: SuiClient } = {}) {
  if (ledger) {
    if (!client) {
      throw new Error("Ledger signing requires a Sui client.");
    }

    const derivationPath = ledgerPath ?? "m/44'/784'/0'/0'/0'";

    const [
      { LedgerSigner },
      { default: TransportNodeHid },
      { default: SuiLedgerClient },
    ] = await Promise.all([
      import("@mysten/signers/ledger"),
      import("@ledgerhq/hw-transport-node-hid"),
      import("@mysten/ledgerjs-hw-app-sui"),
    ]);
    const transport = await TransportNodeHid.open(undefined);
    const ledgerClient = new SuiLedgerClient(transport as never);
    return LedgerSigner.fromDerivationPath(
      derivationPath,
      ledgerClient,
      client
    );
  }

  const env = cleanEnv(process.env, {
    SUI_PRIVATE_KEY: str(),
  });
  return createKeypair(env.SUI_PRIVATE_KEY);
}

export async function executeTransaction(
  client: SuiClient,
  signer: Awaited<ReturnType<typeof createSigner>>,
  tx: Transaction
) {
  const result = await client.signAndExecuteTransaction({
    signer,
    transaction: tx,
  });
  await client.waitForTransaction({ digest: result.digest });
  console.log(`TX Digest: ${result.digest}`);
  return result;
}

export async function extractCoinValue(
  tx: Transaction,
  coin: TransactionResult,
  coinType: string,
  client: SuiClient,
  sender: string
): Promise<bigint> {
  tx.moveCall({
    target: "0x2::coin::value",
    arguments: [coin],
    typeArguments: [coinType],
  });
  let dryRunResult = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender,
  });
  const coinValueResult =
    dryRunResult.results?.[dryRunResult.results.length - 1];
  const coinInAmountBytes: Uint8Array | undefined = coinValueResult
    ?.returnValues?.[0]?.[0]
    ? new Uint8Array(coinValueResult.returnValues[0][0])
    : undefined;
  if (!coinInAmountBytes) {
    console.error("Error: coinInAmountBytes is undefined.");
    process.exit(1);
  }
  const coinInAmount = bcs.u64().parse(coinInAmountBytes!);
  return BigInt(coinInAmount);
}
