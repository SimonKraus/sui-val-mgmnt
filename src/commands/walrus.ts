import type { SuiClientTypes } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Command, InvalidArgumentError } from "commander";
import {
  createKeypair,
  createSuiClient,
  executeTransaction,
  getRequiredEnv,
  parseSuiNetwork,
} from "../utils.js";

type CommonOptions = {
  rpcUrl: string;
  network?: SuiClientTypes.Network;
  packageId: string;
  stakingObjectId: string;
};

function parseCommissionRate(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError("expected an integer between 0 and 10000");
  }
  const parsed = Number(value);
  if (parsed > 10_000) {
    throw new InvalidArgumentError("commission rate must be between 0 and 10000");
  }
  return parsed;
}

const commissionRateDefault = process.env.COMMISSION_RATE
  ? parseCommissionRate(process.env.COMMISSION_RATE)
  : undefined;

function withCommonOptions(command: Command) {
  return command
    .requiredOption(
      "--rpc-url <url>",
      "Sui gRPC URL (or SUI_RPC_URL)",
      process.env.SUI_RPC_URL
    )
    .option(
      "--network <network>",
      "Sui network; inferred from the RPC URL by default",
      parseSuiNetwork
    )
    .requiredOption(
      "--package-id <id>",
      "Walrus package ID (or WALRUS_PACKAGE_ID)",
      process.env.WALRUS_PACKAGE_ID
    )
    .requiredOption(
      "--staking-object-id <id>",
      "Walrus staking object ID (or WALRUS_STAKING_OBJECT_ID)",
      process.env.WALRUS_STAKING_OBJECT_ID ?? process.env.WALRUS_STAKING_ID
    );
}

export function registerWalrusCommands(program: Command) {
  const walrus = program
    .command("walrus")
    .description("Walrus storage node operations");

  withCommonOptions(
    walrus
      .command("claim")
      .description("Claim storage node commission")
      .requiredOption(
        "--transfer-to <address>",
        "Address to transfer rewards to (or DESTINATION_ADDRESS)",
        process.env.DESTINATION_ADDRESS
      )
      .requiredOption(
        "--storage-node-id <id>",
        "Storage node ID (or WALRUS_STORAGE_NODE_ID)",
        process.env.WALRUS_STORAGE_NODE_ID
      )
  ).action(claimStorageNodeCommission);

  withCommonOptions(
    walrus
      .command("set-commission")
      .description("Set the storage node's next commission rate")
      .requiredOption(
        "--commission-rate <rate>",
        "Commission rate in basis points (0-10000)",
        parseCommissionRate,
        commissionRateDefault
      )
      .requiredOption(
        "--storage-node-cap-id <id>",
        "StorageNodeCap object ID (or WALRUS_STORAGE_NODE_CAP_ID)",
        process.env.WALRUS_STORAGE_NODE_CAP_ID
      )
  ).action(setStorageNodeCommissionRate);
}

async function claimStorageNodeCommission(
  options: CommonOptions & {
    transferTo: string;
    storageNodeId: string;
  }
) {
  const client = createSuiClient(options.rpcUrl, options.network);
  const keypair = createKeypair(
    getRequiredEnv("SUI_PRIVATE_KEY_GOVERNANCE")
  );
  console.log(`Sui Address: ${keypair.toSuiAddress()}`);

  const tx = new Transaction();
  const auth = tx.moveCall({
    target: `${options.packageId}::auth::authenticate_sender`,
  });
  const commissionCoin = tx.moveCall({
    target: `${options.packageId}::staking::collect_commission`,
    arguments: [
      tx.object(options.stakingObjectId),
      tx.pure.id(options.storageNodeId),
      auth,
    ],
  });
  tx.transferObjects([commissionCoin], options.transferTo);

  await executeTransaction(client, keypair, tx);
}

async function setStorageNodeCommissionRate(
  options: CommonOptions & {
    commissionRate: number;
    storageNodeCapId: string;
  }
) {
  const client = createSuiClient(options.rpcUrl, options.network);
  const keypair = createKeypair(getRequiredEnv("SUI_PRIVATE_KEY_OPERATOR"));
  console.log(`Sui Address: ${keypair.toSuiAddress()}`);

  const tx = new Transaction();
  tx.moveCall({
    target: `${options.packageId}::staking::set_next_commission`,
    arguments: [
      tx.object(options.stakingObjectId),
      tx.object(options.storageNodeCapId),
      tx.pure.u16(options.commissionRate),
    ],
  });

  await executeTransaction(client, keypair, tx);
}
