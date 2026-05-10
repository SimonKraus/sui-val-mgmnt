import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import { extractCoinValue } from "../utils";
import { createSuiClient, createKeypair, executeTransaction } from "../utils";
import { COIN_TYPES, PACKAGE_IDS } from "../constants";

export function registerWalrusCommands(program: Command) {
  const walrus = program
    .command("walrus")
    .description("Walrus storage node operations");

  walrus
    .command("claim")
    .description("Claim storage node commission")
    .action(claimStorageNodeCommission);
}

async function claimStorageNodeCommission(
  walrusStorageNodeId: string,
  network: "mainnet" | "testnet"
) {
  const env = cleanEnv(process.env, {
    DESTINATION_ADDRESS: str(),
    SUI_PRIVATE_KEY: str(),
    SUI_RPC_URL: str(),
    WALRUS_STORAGE_NODE_ID: str(),
  });

  const walrusPackageId = PACKAGE_IDS.WALRUS[network];
  const walrusStakingPackageId = PACKAGE_IDS.WALRUS_STAKING[network];

  const client = createSuiClient(env.SUI_RPC_URL);
  const keypair = createKeypair(env.SUI_PRIVATE_KEY);

  const tx = new Transaction();
  const auth = tx.moveCall({
    target: `${walrusPackageId}::auth::authenticate_sender`,
    arguments: [],
    typeArguments: [],
  });
  const commissionCoin = tx.moveCall({
    target: `${walrusPackageId}::staking::collect_commission`,
    arguments: [
      tx.object(walrusStakingPackageId),
      tx.object(walrusStorageNodeId),
      auth,
    ],
    typeArguments: [],
  });
  const coinInAmount = await extractCoinValue(
    tx,
    commissionCoin,
    COIN_TYPES.WAL.mainnet,
    client,
    keypair.getPublicKey().toSuiAddress()
  );
  tx.transferObjects([commissionCoin], env.DESTINATION_ADDRESS);

  await executeTransaction(client, keypair, tx);
}
