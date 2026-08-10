import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, str } from "envalid";
import { createSuiClient, executeTransaction } from "../../src/utils.js";

const env = cleanEnv(process.env, {
  DESTINATION_ADDRESS: str(),
  SUI_PRIVATE_KEY_GOVERNANCE: str(),
  SUI_RPC_URL: str(),
  WALRUS_PACKAGE_ID: str(),
  WALRUS_STAKING_OBJECT_ID: str(),
  WALRUS_STORAGE_NODE_ID: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY_GOVERNANCE.trim().toLowerCase());
console.log(`Sui Address: ${keypair.getPublicKey().toSuiAddress()}`);

const tx = new Transaction();
const auth = tx.moveCall({
  target: `${env.WALRUS_PACKAGE_ID}::auth::authenticate_sender`,
  arguments: [],
  typeArguments: [],
});
const commissionCoin = tx.moveCall({
  target: `${env.WALRUS_PACKAGE_ID}::staking::collect_commission`,
  arguments: [
    tx.object(env.WALRUS_STAKING_OBJECT_ID),
    tx.object(env.WALRUS_STORAGE_NODE_ID),
    auth,
  ],
  typeArguments: [],
});
tx.transferObjects([commissionCoin], env.DESTINATION_ADDRESS);
tx.setGasBudget(1_000_000_000);
await executeTransaction(suiClient, keypair, tx);
