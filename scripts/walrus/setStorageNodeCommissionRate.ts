import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, str, num } from "envalid";
import { SuiClient } from "@mysten/sui/client";

const env = cleanEnv(process.env, {
  COMMISSION_RATE: num(),
  SUI_PRIVATE_KEY_OPERATOR: str(),
  SUI_RPC_URL: str(),
  WALRUS_PACKAGE_ID: str(),
  WALRUS_STAKING_ID: str(),
  WALRUS_STORAGE_NODE_ID: str(),
  WALRUS_STORAGE_NODE_CAP_ID: str(),
});

const suiClient = new SuiClient({
  url: env.SUI_RPC_URL,
});

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY_OPERATOR);
console.log(`Sui Address: ${keypair.getPublicKey().toSuiAddress()}`);

const tx = new Transaction();
tx.moveCall({
  target: `${env.WALRUS_PACKAGE_ID}::staking::set_next_commission`,
  arguments: [
    tx.object(env.WALRUS_STAKING_ID),
    tx.object(env.WALRUS_STORAGE_NODE_CAP_ID),
    tx.pure.u16(env.COMMISSION_RATE),
  ],
});
const result = await suiClient.signAndExecuteTransaction({
  signer: keypair,
  transaction: tx,
});
tx.setGasBudget(1_000_000_000);
await suiClient.waitForTransaction({ digest: result.digest });
console.log(`TX Digest: ${result.digest}`);
