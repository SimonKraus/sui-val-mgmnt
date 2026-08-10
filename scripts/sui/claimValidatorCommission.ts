import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, str } from "envalid";
import {
  createSuiClient,
  executeTransaction,
  getOwnedStakedSuiIds,
} from "../../src/utils.js";

const env = cleanEnv(process.env, {
  DESTINATION_ADDRESS: str(),
  SUI_PRIVATE_KEY: str(),
  SUI_RPC_URL: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY);
const validatorAddress = keypair.getPublicKey().toSuiAddress();

const stakeIds = await getOwnedStakedSuiIds(suiClient, validatorAddress);
console.log(`Found ${stakeIds.length} stakes`);
if (stakeIds.length === 0) {
  console.log(`No stakes found for ${validatorAddress}`);
  process.exit(0);
}

const tx = new Transaction();
const balance = tx.moveCall({
  target: "0x2::balance::zero",
  arguments: [],
  typeArguments: ["0x2::sui::SUI"],
});
for (const stakeId of stakeIds) {
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
await executeTransaction(suiClient, keypair, tx);
