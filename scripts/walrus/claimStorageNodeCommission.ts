import { Transaction } from "@mysten/sui/transactions";
import { cleanEnv, str } from "envalid";
import {
  createSigner,
  createSuiClient,
  executeTransaction,
  getSignerOptionsFromArgv,
} from "../../src/utils.js";

const env = cleanEnv(process.env, {
  DESTINATION_ADDRESS: str(),
  SUI_RPC_URL: str(),
  WALRUS_PACKAGE_ID: str(),
  WALRUS_STAKING_PACKAGE_ID: str(),
  WALRUS_STORAGE_NODE_ID: str(),
});

const suiClient = createSuiClient(env.SUI_RPC_URL);
const signer = await createSigner({
  ...getSignerOptionsFromArgv(),
  client: suiClient,
});

const tx = new Transaction();
const auth = tx.moveCall({
  target: `${env.WALRUS_PACKAGE_ID}::auth::authenticate_sender`,
  arguments: [],
  typeArguments: [],
});
const commissionCoin = tx.moveCall({
  target: `${env.WALRUS_PACKAGE_ID}::staking::collect_commission`,
  arguments: [
    tx.object(env.WALRUS_STAKING_PACKAGE_ID),
    tx.object(env.WALRUS_STORAGE_NODE_ID),
    auth,
  ],
  typeArguments: [],
});
tx.transferObjects([commissionCoin], env.DESTINATION_ADDRESS);
await executeTransaction(suiClient, signer, tx);
