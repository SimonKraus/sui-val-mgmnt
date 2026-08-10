import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, num, str } from "envalid";
import { createSuiClient, executeTransaction } from "../../src/utils.js";

const env = cleanEnv(process.env, {
  COMMISSION_RATE: num(),
  SUI_PRIVATE_KEY: str(),
  SUI_RPC_URL: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY);

const tx = new Transaction();
tx.moveCall({
  target: "0x3::sui_system::request_set_commission_rate",
  arguments: [tx.object("0x5"), tx.pure.u64(env.COMMISSION_RATE)],
  typeArguments: [],
});
await executeTransaction(suiClient, keypair, tx);
