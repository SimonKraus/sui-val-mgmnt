import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import { extractCoinValue } from "../utils";
import { createSuiClient, createSigner, executeTransaction } from "../utils";
import { COIN_TYPES, PACKAGE_IDS } from "../constants";
import { addSignerOptions, type SignerOptions } from "./utils.js";

export function registerWalrusCommands(program: Command) {
  const walrus = program
    .command("walrus")
    .description("Walrus storage node operations");

  addSignerOptions(
    walrus.command("claim").description("Claim storage node commission")
  ).action(claimStorageNodeCommission);
}

async function claimStorageNodeCommission(
  { ledger, ledgerPath }: SignerOptions
) {
  const env = cleanEnv(process.env, {
    DESTINATION_ADDRESS: str(),
    SUI_RPC_URL: str(),
    WALRUS_PACKAGE_ID: str(),
    WALRUS_STAKING_PACKAGE_ID: str(),
    WALRUS_STORAGE_NODE_ID: str(),
  });

  const walrusPackageId = PACKAGE_IDS.WALRUS.mainnet;
  const walrusStakingPackageId = PACKAGE_IDS.WALRUS_STAKING.mainnet;

  const client = createSuiClient(env.SUI_RPC_URL);
  const signer = await createSigner({ client, ledger, ledgerPath });

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
      tx.object(env.WALRUS_STORAGE_NODE_ID),
      auth,
    ],
    typeArguments: [],
  });
  await extractCoinValue(
    tx,
    commissionCoin,
    COIN_TYPES.WAL.mainnet,
    client,
    signer.toSuiAddress()
  );
  tx.transferObjects([commissionCoin], env.DESTINATION_ADDRESS);

  await executeTransaction(client, signer, tx);
}
