import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, num, str } from "envalid";
import {
  createSigner,
  createSuiClient,
  executeTransaction,
  getSignerOptionsFromArgv,
} from "../../src/utils.js";

const env = cleanEnv(process.env, {
  COMMISSION_RATE: num(),
  SUI_RPC_URL: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);
const signer = await createSigner({
  ...getSignerOptionsFromArgv(),
  client: suiClient,
});

const tx = new Transaction();
tx.moveCall({
  target: "0x3::sui_system::request_set_commission_rate",
  arguments: [tx.object("0x5"), tx.pure.u64(env.COMMISSION_RATE)],
  typeArguments: [],
});
await executeTransaction(suiClient, signer, tx);
