import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import {
  createSigner,
  createSuiClient,
  executeTransaction,
  getSignerOptionsFromArgv,
} from "../../src/utils.js";

const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="));
const batchSizeIndex = process.argv.indexOf("--batch-size");
const batchSizeValue =
  batchSizeArg?.slice("--batch-size=".length) ??
  (batchSizeIndex >= 0 ? process.argv[batchSizeIndex + 1] : undefined);
const batchSize = batchSizeValue ? Number.parseInt(batchSizeValue, 10) : 100;

if (!Number.isInteger(batchSize) || batchSize <= 0) {
  throw new Error("--batch-size must be a positive integer.");
}

const env = cleanEnv(process.env, {
  DESTINATION_ADDRESS: str(),
  SUI_RPC_URL: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);
const signer = await createSigner({
  ...getSignerOptionsFromArgv(),
  client: suiClient,
});
const validatorAddress = signer.toSuiAddress();

const stakePositions = await suiClient.getStakes({
  owner: validatorAddress,
});
const stakeIds = [];
for (const stakePosition of stakePositions) {
  console.log(`Found ${stakePosition.stakes.length} stakes`);
  for (const stake of stakePosition.stakes) {
    stakeIds.push(stake.stakedSuiId);
  }
}
if (stakeIds.length === 0) {
  console.log(`No stakes found for ${validatorAddress}`);
  process.exit(0);
}

console.log(`Batch size: ${batchSize}`);

for (let index = 0; index < stakeIds.length; index += batchSize) {
  const stakeBatch = stakeIds.slice(index, index + batchSize);
  console.log(
    `Processing batch ${Math.floor(index / batchSize) + 1}/${Math.ceil(
      stakeIds.length / batchSize
    )} with ${stakeBatch.length} stakes`
  );

  const tx = new Transaction();
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
  tx.transferObjects([coin], env.DESTINATION_ADDRESS);
  await executeTransaction(suiClient, signer, tx);
}
