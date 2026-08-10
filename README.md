# Mirai Scripts

A collection of helpful scripts that we use everyday at Studio Mirai.

# Sui

## Claim Validator Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to transfer rewards to.
- `SUI_PRIVATE_KEY` - Sui private key for the validator.
- `SUI_RPC_URL` - Sui gRPC base URL to use for the transaction.

```
bun run scripts/sui/claimValidatorCommission.ts
```

## Set Validator Commission Rate

### Required Environment Variables

- `COMMISSION_RATE` - The new commission rate to set (e.g. 1000 for 10%).
- `SUI_PRIVATE_KEY` - Sui private key for signing the transaction.
- `SUI_RPC_URL` - Sui gRPC base URL to use for the transaction.

```
bun run scripts/sui/setValidatorCommissionRate.ts
```

## Set Validator Gas Price

### Required Environment Variables

- `GAS_PRICE` - The new gas price to set (e.g. 300 for 300 MIST).
- `SUI_PRIVATE_KEY` - Sui private key for signing the transaction.
- `SUI_RPC_URL` - Sui gRPC base URL to use for the transaction.
- `VALIDATOR_OPERATION_CAP_ID` - The operation capability object ID for your validator.

```
bun run scripts/sui/setValidatorGasPrice.ts
```

# Walrus

## Claim Storage Node Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to transfer commission rewards to.
- `SUI_PRIVATE_KEY` - Sui private key for authorizing the transaction.
- `SUI_RPC_URL` - Sui gRPC base URL to use for sending the transaction.
- `WALRUS_PACKAGE_ID` - Package ID for the Walrus package.
- `WALRUS_STAKING_PACKAGE_ID` - Package ID for the Walrus staking package.
- `WALRUS_STORAGE_NODE_ID` - The Storage Node object ID for your node.

```
bun run scripts/walrus/claimStorageNodeCommission.ts
```

# Ika

## Claim Validator Node Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to which the collected commission should be sent.
- `IKA_VALIDATOR_COMMISSION_CAP_ID` - The validator's `ValidatorCommissionCap` object ID for the Ika system.
- `SUI_PRIVATE_KEY` - Sui private key for signing the transaction.
- `SUI_RPC_URL` - Sui gRPC base URL to use for sending the transaction.

```
bun run scripts/ika/claimValidatorCommission.ts
```

`SUI_NETWORK` is optional. The scripts infer `mainnet`, `testnet`, `devnet`, or
`localnet` from common endpoint hostnames and otherwise default to `mainnet`.
Set `SUI_NETWORK` explicitly when using a custom endpoint.
