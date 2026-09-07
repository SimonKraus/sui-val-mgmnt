# Mirai Scripts

Studio Mirai's frequently used command-line operations for Sui validators,
Walrus storage nodes, and Ika validators.

## Setup

Install [Bun](https://bun.sh), clone this repository, and install dependencies:

```sh
bun install --frozen-lockfile
```

Commands can sign with a private key supplied through the environment variable
documented below, or with a connected Ledger. Keep private keys out of shell
history and never commit them to this repository.

Run the CLI with:

```sh
bun run cli -- --help
```

Non-secret options can also be supplied through the environment variables named
in each command's help output. `--network` is optional: the CLI recognizes
common mainnet, testnet, devnet, and localnet RPC hostnames and otherwise
defaults to mainnet.

To sign any command with an unlocked Ledger running the Sui app, add `--ledger`.
The default derivation path is `m/44'/784'/0'/0'/0'`; override it with
`--ledger-path <path>` when needed. The command's private-key environment
variable is not required in Ledger mode.

## Sui validator

Sui commands use `SUI_PRIVATE_KEY`.

Claim commission rewards and transfer them:

```sh
bun run cli -- sui claim \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --transfer-to 0x...
```

Optionally swap claimed SUI on mainnet through Aftermath before transferring it:

```sh
bun run cli -- sui claim \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --transfer-to 0x... \
  --swap-to 0x...::coin::COIN \
  --swap-slippage 0.01
```

Claims are submitted in batches of 100 stake objects by default. Use
`--batch-size <n>` to choose a different positive batch size.

Set the commission rate in basis points (`1000` is 10%):

```sh
bun run cli -- sui set-commission \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --commission-rate 1000
```

Set the validator gas price in MIST:

```sh
bun run cli -- sui set-gas-price \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --gas-price 300 \
  --validator-operation-cap-id 0x...
```

For example, to claim with Ledger:

```sh
bun run cli -- sui claim \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --transfer-to 0x... \
  --ledger
```

## Walrus storage node

Claiming commission uses `SUI_PRIVATE_KEY_GOVERNANCE`:

```sh
bun run cli -- walrus claim \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --package-id 0x... \
  --staking-object-id 0x... \
  --storage-node-id 0x... \
  --transfer-to 0x...
```

Changing commission uses `SUI_PRIVATE_KEY_OPERATOR`:

```sh
bun run cli -- walrus set-commission \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --package-id 0x... \
  --staking-object-id 0x... \
  --storage-node-cap-id 0x... \
  --commission-rate 1000
```

## Ika validator

Ika commands use `SUI_PRIVATE_KEY`:

```sh
bun run cli -- ika claim \
  --rpc-url https://fullnode.mainnet.sui.io:443 \
  --package-id 0x... \
  --system-id 0x... \
  --commission-cap-id 0x... \
  --transfer-to 0x...
```

Use `--help` at any level to see all options, including compatible environment
variable names:

```sh
bun run cli -- walrus claim --help
```
