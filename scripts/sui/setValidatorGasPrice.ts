import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, num, str } from "envalid";
import {
  createSigner,
  createSuiClient,
  executeTransaction,
  getSignerOptionsFromArgv,
} from "../../src/utils.js";

const env = cleanEnv(process.env, {
  GAS_PRICE: num(),
  SUI_RPC_URL: str(),
  VALIDATOR_OPERATION_CAP_ID: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);
const signer = await createSigner({
  ...getSignerOptionsFromArgv(),
  client: suiClient,
});

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
await executeTransaction(suiClient, signer, tx);
