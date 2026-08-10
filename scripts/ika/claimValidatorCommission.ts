import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, str } from "envalid";
import { createSuiClient, executeTransaction } from "../../src/utils.js";

const env = cleanEnv(process.env, {
  DESTINATION_ADDRESS: str(),
  IKA_PACKAGE_ID: str(),
  IKA_SYSTEM_ID: str(),
  IKA_VALIDATOR_COMMISSION_CAP_ID: str(),
  SUI_PRIVATE_KEY: str(),
  SUI_RPC_URL: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY);
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
await executeTransaction(suiClient, keypair, tx);
