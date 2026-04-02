import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import { createSuiClient, createSigner, executeTransaction } from "../utils.js";
import { addSignerOptions, type SignerOptions } from "./utils.js";

export function registerIkaCommands(program: Command) {
  const ika = program.command("ika").description("Ika validator operations");

  addSignerOptions(
    ika.command("claim").description("Claim validator commission")
  ).action(claimValidatorCommission);
}

async function claimValidatorCommission({ ledger, ledgerPath }: SignerOptions) {
  const env = cleanEnv(process.env, {
    DESTINATION_ADDRESS: str(),
    IKA_PACKAGE_ID: str(),
    IKA_SYSTEM_ID: str(),
    IKA_VALIDATOR_COMMISSION_CAP_ID: str(),
    SUI_RPC_URL: str(),
  });

  const client = createSuiClient(env.SUI_RPC_URL);
  const signer = await createSigner({ client, ledger, ledgerPath });
  console.log(`Sui Address: ${signer.toSuiAddress()}`);

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

  await executeTransaction(client, signer, tx);
}
