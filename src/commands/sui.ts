import type { Command } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import {
  createSuiClient,
  createSigner,
  executeTransaction,
} from "../utils.js";
import { Aftermath } from "aftermath-ts-sdk";
import { extractCoinValue } from "../utils";
import { COIN_TYPES } from "../constants";
import { addSignerOptions, type SignerOptions } from "./utils.js";

export function registerSuiCommands(program: Command) {
  const sui = program.command("sui").description("Sui validator operations");

  addSignerOptions(
    sui
      .command("claim")
      .description("Claim validator commission rewards")
      .requiredOption(
        "--transfer-to <address>",
        "Address to transfer rewards to"
      )
      .requiredOption("--rpc-url <url>", "Sui RPC URL")
      .option("--swap-to <coinType>", "Coin type to swap to (defaults to USDC)")
      .option(
        "--batch-size <size>",
        "Number of stake objects to claim per transaction",
        parseInt,
        100
      )
  ).action(claimValidatorCommission);

  addSignerOptions(
    sui
      .command("set-commission")
      .description("Set validator commission rate")
      .requiredOption("--commission-rate <rate>", "Commission rate", parseFloat)
      .requiredOption("--rpc-url <url>", "Sui RPC URL")
  ).action(setValidatorCommissionRate);

  addSignerOptions(
    sui
      .command("set-gas-price")
      .description("Set validator gas price")
      .requiredOption("--gas-price <price>", "Gas price", parseFloat)
      .requiredOption("--rpc-url <url>", "Sui RPC URL")
      .requiredOption(
        "--validator-operation-cap-id <id>",
        "Validator operation cap ID"
      )
  ).action(setValidatorGasPrice);
}

async function claimValidatorCommission({
  transferTo,
  rpcUrl,
  swapTo,
  swapSlippage = 0.01,
  batchSize = 100,
  ledger,
  ledgerPath,
}: {
  transferTo: string;
  rpcUrl: string;
  swapTo?: string;
  swapSlippage?: number;
  batchSize?: number;
} & SignerOptions) {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("--batch-size must be a positive integer.");
  }

  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Transfer to: ${transferTo}`);
  console.log(`Swap to: ${swapTo ? swapTo : "N/A"}`);
  console.log(`Swap slippage: ${(swapSlippage * 100).toFixed(2)}%`);
  console.log(`Batch size: ${batchSize}`);

  const client = createSuiClient(rpcUrl);
  const signer = await createSigner({ client, ledger, ledgerPath });
  const validatorAddress = signer.toSuiAddress();

  const stakePositions = await client.getStakes({ owner: validatorAddress });
  const stakeIds: string[] = [];

  for (const stakePosition of stakePositions) {
    console.log(`Found ${stakePosition.stakes.length} stakes`);
    for (const stake of stakePosition.stakes) {
      stakeIds.push(stake.stakedSuiId);
    }
  }

  if (stakeIds.length === 0) {
    console.log(`No stakes found for ${validatorAddress}`);
    return;
  }

  const stakeBatches: string[][] = [];
  for (let index = 0; index < stakeIds.length; index += batchSize) {
    stakeBatches.push(stakeIds.slice(index, index + batchSize));
  }

  let router: ReturnType<Aftermath["Router"]> | undefined;
  if (swapTo) {
    const afSdk = new Aftermath("MAINNET");
    await afSdk.init();
    router = afSdk.Router();
  }

  for (const [batchIndex, stakeBatch] of stakeBatches.entries()) {
    console.log(
      `Processing batch ${batchIndex + 1}/${stakeBatches.length} with ${stakeBatch.length} stakes`
    );

    let tx = new Transaction();
    const balance = tx.moveCall({
      target: "0x2::balance::zero",
      arguments: [],
      typeArguments: ["0x2::sui::SUI"],
    });

    for (const stakeId of stakeBatch) {
      const withdrawnBalance = tx.moveCall({
        target: "0x3::sui_system::request_withdraw_stake_non_entry",
        arguments: [tx.object("0x5"), tx.object(stakeId)],
      });
      tx.moveCall({
        target: "0x2::balance::join",
        arguments: [balance, withdrawnBalance],
        typeArguments: ["0x2::sui::SUI"],
      });
    }

    const coin = tx.moveCall({
      target: "0x2::coin::from_balance",
      arguments: [balance],
      typeArguments: ["0x2::sui::SUI"],
    });

    if (swapTo && router) {
      const coinInAmount = await extractCoinValue(
        tx,
        coin,
        "0x2::sui::SUI",
        client,
        validatorAddress
      );
      const route = await router.getCompleteTradeRouteGivenAmountIn({
        coinInType: "0x2::sui::SUI",
        coinOutType: swapTo,
        coinInAmount,
      });
      const { tx: txWithRoute, coinOutId } =
        await router.addTransactionForCompleteTradeRoute({
          tx,
          completeRoute: route,
          slippage: swapSlippage,
          walletAddress: validatorAddress,
          coinInId: coin,
        });
      if (!coinOutId) {
        console.error("Error: coinOutId is undefined.");
        process.exit(1);
      }
      tx = txWithRoute;
      tx.transferObjects([coinOutId], transferTo);
    } else {
      tx.transferObjects([coin], transferTo);
    }

    await executeTransaction(client, signer, tx);
  }
}

async function setValidatorCommissionRate(options: {
  commissionRate: number;
  rpcUrl: string;
} & SignerOptions) {
  const client = createSuiClient(options.rpcUrl);
  const signer = await createSigner({ ...options, client });

  const tx = new Transaction();
  tx.moveCall({
    target: "0x3::sui_system::request_set_commission_rate",
    arguments: [tx.object("0x5"), tx.pure.u64(options.commissionRate)],
    typeArguments: [],
  });

  await executeTransaction(client, signer, tx);
}

async function setValidatorGasPrice(options: {
  gasPrice: number;
  rpcUrl: string;
  validatorOperationCapId: string;
} & SignerOptions) {
  const client = createSuiClient(options.rpcUrl);
  const signer = await createSigner({ ...options, client });

  const tx = new Transaction();
  tx.moveCall({
    target: "0x3::sui_system::request_set_gas_price",
    arguments: [
      tx.object("0x5"),
      tx.object(options.validatorOperationCapId),
      tx.pure.u64(options.gasPrice),
    ],
    typeArguments: [],
  });

  await executeTransaction(client, signer, tx);
}
