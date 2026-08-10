import type { SuiClientTypes } from "@mysten/sui/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import type { TransactionResult } from "@mysten/sui/transactions";
import { bcs } from "@mysten/bcs";

const STAKED_SUI_TYPE = "0x3::staking_pool::StakedSui";

export function getBaseEnv() {
  return cleanEnv(process.env, {
    SUI_PRIVATE_KEY: str(),
    SUI_RPC_URL: str(),
  });
}

function inferSuiNetwork(baseUrl: string): SuiClientTypes.Network {
  const configuredNetwork = process.env.SUI_NETWORK?.trim().toLowerCase();
  if (configuredNetwork) {
    return configuredNetwork;
  }

  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    if (hostname.includes("testnet")) return "testnet";
    if (hostname.includes("devnet")) return "devnet";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "localnet";
    }
  } catch {
    // Let the gRPC transport report malformed URLs with its normal error.
  }

  return "mainnet";
}

export function createSuiClient(
  baseUrl: string,
  network: SuiClientTypes.Network = inferSuiNetwork(baseUrl)
) {
  return new SuiGrpcClient({ baseUrl, network });
}

export function createKeypair(privateKey: string) {
  return Ed25519Keypair.fromSecretKey(privateKey);
}

export async function executeTransaction(
  client: SuiGrpcClient,
  keypair: Ed25519Keypair,
  tx: Transaction
) {
  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error(
      result.FailedTransaction.status.error?.message ?? "Transaction failed"
    );
  }

  await client.waitForTransaction({ result });
  console.log(`TX Digest: ${result.Transaction.digest}`);
  return result;
}

export async function getOwnedStakedSuiIds(
  client: SuiGrpcClient,
  owner: string
): Promise<string[]> {
  const stakeIds: string[] = [];
  let cursor: string | null = null;

  do {
    const page: SuiClientTypes.ListOwnedObjectsResponse = await client.listOwnedObjects({
      owner,
      type: STAKED_SUI_TYPE,
      cursor,
    });
    stakeIds.push(...page.objects.map((object) => object.objectId));
    cursor = page.cursor;
  } while (cursor);

  return stakeIds;
}

export async function extractCoinValue(
  tx: Transaction,
  coin: TransactionResult,
  coinType: string,
  client: SuiGrpcClient,
  sender: string
): Promise<bigint> {
  tx.moveCall({
    target: "0x2::coin::value",
    arguments: [coin],
    typeArguments: [coinType],
  });
  tx.setSenderIfNotSet(sender);

  const simulation = await client.simulateTransaction({
    transaction: tx,
    checksEnabled: false,
    include: { commandResults: true },
  });

  if (simulation.$kind === "FailedTransaction") {
    throw new Error(
      simulation.FailedTransaction.status.error?.message ??
        "Transaction simulation failed"
    );
  }

  const coinInAmountBytes = simulation.commandResults.at(-1)?.returnValues[0]?.bcs;
  if (!coinInAmountBytes) {
    throw new Error("Coin value simulation did not return a value");
  }

  const coinInAmount = bcs.u64().parse(coinInAmountBytes);
  return BigInt(coinInAmount);
}
