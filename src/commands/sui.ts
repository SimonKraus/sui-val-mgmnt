import { Command, InvalidArgumentError } from "commander";
import { Transaction } from "@mysten/sui/transactions";
import {
  createSuiClient,
  createSigner,
  executeTransaction,
  getOwnedStakedSuiIds,
  inferSuiNetwork,
  parseSuiNetwork,
} from "../utils.js";
import { Aftermath } from "aftermath-ts-sdk";
import { extractCoinValue } from "../utils.js";
import type { SuiClientTypes } from "@mysten/sui/client";
import { addSignerOptions, type SignerOptions } from "./utils.js";

type RpcOptions = {
  rpcUrl: string;
  network?: SuiClientTypes.Network;
};

function parseU64(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError("expected a non-negative integer");
  }
  const parsed = BigInt(value);
  if (parsed > 18_446_744_073_709_551_615n) {
    throw new InvalidArgumentError("value exceeds the u64 maximum");
  }
  return parsed;
}

function parseCommissionRate(value: string): bigint {
  const parsed = parseU64(value);
  if (parsed > 10_000n) {
    throw new InvalidArgumentError("commission rate must be between 0 and 10000");
  }
  return parsed;
}

function parseSlippage(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new InvalidArgumentError("slippage must be between 0 and 1");
  }
  return parsed;
}

const commissionRateDefault = process.env.COMMISSION_RATE
  ? parseCommissionRate(process.env.COMMISSION_RATE)
  : undefined;
const gasPriceDefault = process.env.GAS_PRICE
  ? parseU64(process.env.GAS_PRICE)
  : undefined;

function withRpcOptions(command: Command) {
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
    );
}

export function registerSuiCommands(program: Command) {
  const sui = program.command("sui").description("Sui validator operations");

  addSignerOptions(
    withRpcOptions(
      sui
        .command("claim")
        .description("Claim validator commission rewards")
        .requiredOption(
          "--transfer-to <address>",
          "Address to transfer rewards to (or DESTINATION_ADDRESS)",
          process.env.DESTINATION_ADDRESS
        )
    )
  )
    .option("--swap-to <coin-type>", "Coin type to swap the rewards to")
    .option(
      "--swap-slippage <fraction>",
      "Maximum swap slippage as a fraction",
      parseSlippage,
      0.01
    )
    .option(
      "--batch-size <size>",
      "Number of stake objects to claim per transaction",
      (value) => Number.parseInt(value, 10),
      100
    )
    .action(claimValidatorCommission);

  addSignerOptions(
    withRpcOptions(
      sui
        .command("set-commission")
        .description("Set validator commission rate")
        .requiredOption(
          "--commission-rate <rate>",
          "Commission rate in basis points (0-10000)",
          parseCommissionRate,
          commissionRateDefault
        )
    )
  ).action(setValidatorCommissionRate);

  addSignerOptions(
    withRpcOptions(
      sui
        .command("set-gas-price")
        .description("Set validator gas price")
        .requiredOption(
          "--gas-price <mist>",
          "Gas price in MIST",
          parseU64,
          gasPriceDefault
        )
        .requiredOption(
          "--validator-operation-cap-id <id>",
          "Validator operation cap ID (or VALIDATOR_OPERATION_CAP_ID)",
          process.env.VALIDATOR_OPERATION_CAP_ID
        )
    )
  ).action(setValidatorGasPrice);
}

async function claimValidatorCommission({
  transferTo,
  rpcUrl,
  network,
  swapTo,
  swapSlippage = 0.01,
  batchSize = 100,
  ledger,
  ledgerPath,
}: {
  transferTo: string;
  network?: SuiClientTypes.Network;
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

  const resolvedNetwork = network ?? inferSuiNetwork(rpcUrl);
  const client = createSuiClient(rpcUrl, resolvedNetwork);
  const signer = await createSigner({ client, ledger, ledgerPath });
  const validatorAddress = signer.toSuiAddress();

  const stakeIds = await getOwnedStakedSuiIds(client, validatorAddress);
  console.log(`Found ${stakeIds.length} stakes`);

  if (stakeIds.length === 0) {
    console.log(`No stakes found for ${validatorAddress}`);
    return;
  }

  if (swapTo && resolvedNetwork !== "mainnet") {
    throw new Error("Reward swaps are currently supported on mainnet only");
  }

  const router = swapTo
    ? (
        await Aftermath.create({
          network: "MAINNET",
          fullnodeUrl: rpcUrl,
        })
      ).Router()
    : undefined;

  for (let offset = 0; offset < stakeIds.length; offset += batchSize) {
    const stakeBatch = stakeIds.slice(offset, offset + batchSize);
    const batchNumber = Math.floor(offset / batchSize) + 1;
    const batchCount = Math.ceil(stakeIds.length / batchSize);
    console.log(
      `Processing batch ${batchNumber}/${batchCount} with ${stakeBatch.length} stakes`
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
        throw new Error("Aftermath did not return an output coin");
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
  commissionRate: bigint;
} & RpcOptions & SignerOptions) {
  const client = createSuiClient(options.rpcUrl, options.network);
  const signer = await createSigner({ client, ...options });

  const tx = new Transaction();
  tx.moveCall({
    target: "0x3::sui_system::request_set_commission_rate",
    arguments: [tx.object("0x5"), tx.pure.u64(options.commissionRate)],
    typeArguments: [],
  });

  await executeTransaction(client, signer, tx);
}

async function setValidatorGasPrice(options: {
  gasPrice: bigint;
  validatorOperationCapId: string;
} & RpcOptions & SignerOptions) {
  const client = createSuiClient(options.rpcUrl, options.network);
  const signer = await createSigner({ client, ...options });

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
