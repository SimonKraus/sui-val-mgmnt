import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { cleanEnv, num, str } from "envalid";
import { createSuiClient, executeTransaction } from "../../src/utils.js";

const env = cleanEnv(process.env, {
  GAS_PRICE: num(),
  SUI_PRIVATE_KEY: str(),
  SUI_RPC_URL: str(),
  VALIDATOR_OPERATION_CAP_ID: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);

const keypair = Ed25519Keypair.fromSecretKey(env.SUI_PRIVATE_KEY);

const tx = new Transaction();
tx.moveCall({
  target: "0x3::sui_system::request_set_gas_price",
  arguments: [
    tx.object("0x5"),
    tx.object(env.VALIDATOR_OPERATION_CAP_ID),
    tx.pure.u64(env.GAS_PRICE),
  ],
  typeArguments: [],
});
await executeTransaction(suiClient, keypair, tx);
