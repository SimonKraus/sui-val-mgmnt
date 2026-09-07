import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import {
  createSuiClient,
  createKeypair,
  executeTransaction,
  getRequiredEnv,
  parseSuiNetwork,
} from "../utils.js";
import type { SuiClientTypes } from "@mysten/sui/client";

export function registerIkaCommands(program: Command) {
  const ika = program.command("ika").description("Ika validator operations");

  ika
    .command("claim")
    .description("Claim validator commission")
    .requiredOption(
      "--transfer-to <address>",
      "Address to transfer rewards to (or DESTINATION_ADDRESS)",
      process.env.DESTINATION_ADDRESS
    )
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
      "Ika package ID (or IKA_PACKAGE_ID)",
      process.env.IKA_PACKAGE_ID
    )
    .requiredOption(
      "--system-id <id>",
      "Ika system object ID (or IKA_SYSTEM_ID)",
      process.env.IKA_SYSTEM_ID
    )
    .requiredOption(
      "--commission-cap-id <id>",
      "ValidatorCommissionCap object ID (or IKA_VALIDATOR_COMMISSION_CAP_ID)",
      process.env.IKA_VALIDATOR_COMMISSION_CAP_ID
    )
    .action(claimValidatorCommission);
}

async function claimValidatorCommission(options: {
  transferTo: string;
  rpcUrl: string;
  network?: SuiClientTypes.Network;
  packageId: string;
  systemId: string;
  commissionCapId: string;
}) {
  const client = createSuiClient(options.rpcUrl, options.network);
  const keypair = createKeypair(getRequiredEnv("SUI_PRIVATE_KEY"));
  console.log(`Sui Address: ${keypair.getPublicKey().toSuiAddress()}`);

  const tx = new Transaction();
  const commissionCoin = tx.moveCall({
    target: `${options.packageId}::system::collect_commission`,
    arguments: [
      tx.object(options.systemId),
      tx.object(options.commissionCapId),
      tx.pure.option("u64", null),
    ],
    typeArguments: [],
  });
  tx.transferObjects([commissionCoin], options.transferTo);
  await executeTransaction(client, keypair, tx);
}
