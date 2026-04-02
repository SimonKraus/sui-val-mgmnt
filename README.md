# Mirai Scripts

A collection of CLI commands and helper scripts for Sui, Ika, and Walrus validator operations.

## Signing Modes

The CLI now supports two signing modes:

- Private key: provide `SUI_PRIVATE_KEY`.
- Ledger: pass `--ledger` and connect an unlocked Ledger running the Sui app.

Optional Ledger flags:

- `--ledger-path <path>` to override the default derivation path `m/44'/784'/0'/0'/0'`.

# Sui

## Claim Validator Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to transfer rewards to.
- `SUI_RPC_URL` - Sui RPC URL to use for the transaction.

```
bun run src/cli.ts sui claim --transfer-to <address> --rpc-url <url>
```

With Ledger:

```
bun run src/cli.ts sui claim --transfer-to <address> --rpc-url <url> --ledger
```

## Set Validator Commission Rate

### Required Environment Variables

- `COMMISSION_RATE` - The new commission rate to set (e.g. 1000 for 10%).
- `SUI_RPC_URL` - Sui RPC URL to use for the transaction.

```
bun run src/cli.ts sui set-commission --commission-rate <rate> --rpc-url <url>
```

With Ledger:

```
bun run src/cli.ts sui set-commission --commission-rate <rate> --rpc-url <url> --ledger
```

## Set Validator Gas Price

### Required Environment Variables

- `GAS_PRICE` - The new gas price to set (e.g. 300 for 300 MIST).
- `SUI_RPC_URL` - Sui RPC URL to use for the transaction.
- `VALIDATOR_OPERATION_CAP_ID` - The operation capability object ID for your validator.

```
bun run src/cli.ts sui set-gas-price --gas-price <price> --rpc-url <url> --validator-operation-cap-id <id>
```

With Ledger:

```
bun run src/cli.ts sui set-gas-price --gas-price <price> --rpc-url <url> --validator-operation-cap-id <id> --ledger
```

# Walrus

## Claim Storage Node Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to transfer commission rewards to.
- `SUI_RPC_URL` - Sui RPC URL to use for sending the transaction.
- `WALRUS_PACKAGE_ID` - Package ID for the Walrus package.
- `WALRUS_STAKING_PACKAGE_ID` - Package ID for the Walrus staking package.
- `WALRUS_STORAGE_NODE_ID` - The Storage Node object ID for your node.

```
bun run src/cli.ts walrus claim
```

With Ledger:

```
bun run src/cli.ts walrus claim --ledger
```

# Ika

## Claim Validator Node Commission

### Required Environment Variables

- `DESTINATION_ADDRESS` - The address to which the collected commission should be sent.
- `IKA_VALIDATOR_COMMISSION_CAP_ID` - The validator's `ValidatorCommissionCap` object ID for the Ika system.
- `SUI_RPC_URL` - Sui RPC URL to use for sending the transaction.

```
bun run src/cli.ts ika claim
```

With Ledger:

```
bun run src/cli.ts ika claim --ledger
```
