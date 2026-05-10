import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import {
  createSuiClient,
  createKeypair,
  executeTransaction,
} from "../utils.js";

export function registerIkaCommands(program: Command) {
  const ika = program.command("ika").description("Ika validator operations");

  ika
    .command("claim")
    .description("Claim validator commission")
    .action(claimValidatorCommission);
}

async function claimValidatorCommission() {
  const env = cleanEnv(process.env, {
    DESTINATION_ADDRESS: str(),
    IKA_PACKAGE_ID: str(),
    IKA_SYSTEM_ID: str(),
    IKA_VALIDATOR_COMMISSION_CAP_ID: str(),
    SUI_PRIVATE_KEY: str(),
    SUI_RPC_URL: str(),
  });

  console.log(`IKA_PACKAGE_ID: ${env.IKA_PACKAGE_ID}`);

  const client = createSuiClient(env.SUI_RPC_URL);
  const keypair = createKeypair(env.SUI_PRIVATE_KEY);
  console.log(`Sui Address: ${keypair.getPublicKey().toSuiAddress()}`);

  const tx = new Transaction();
  const amount = tx.moveCall({
    target: "0x1::option::none",
    arguments: [],
    typeArguments: ["u64"],
  });
  const commissionCoin = tx.moveCall({
    target: `${env.IKA_PACKAGE_ID}::system::collect_commission`,
    arguments: [
      tx.object(env.IKA_SYSTEM_ID),
      tx.object(env.IKA_VALIDATOR_COMMISSION_CAP_ID),
      amount,
    ],
    typeArguments: [],
  });
  tx.transferObjects([commissionCoin], env.DESTINATION_ADDRESS);
  await executeTransaction(client, keypair, tx);
}
