# @skalenetwork/cli

[![npm version](https://img.shields.io/npm/v/@skalenetwork/cli.svg)](https://www.npmjs.com/package/@skalenetwork/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A command-line interface for interacting with the SKALE Network. Read contract data from SKALE chains and Ethereum mainnet.

**Built for AI Agents** — This CLI is designed to be used by AI agents and automation tools via MCP (Model Context Protocol) and standard CLI interfaces.

## Installation

### Global Install

```bash
# npm
npm install -g @skalenetwork/cli

# bun
bun install -g @skalenetwork/cli
```

### One-time Usage (no install)

```bash
# Using npx
npx @skalenetwork/cli <command>

# Using bunx
bunx @skalenetwork/cli <command>
```

## AI Agents

This CLI is optimized for AI agents and automated workflows:

- **Structured JSON output** — All commands support JSON output for easy parsing
- **MCP compatible** — Works with Model Context Protocol and agent frameworks
- **Deterministic responses** — Consistent output format for reliable automation
- **No interactive prompts** — All inputs via flags and arguments

### Example: Agent Usage

```bash
# List chains as JSON for agent parsing
skale chains list --format json

# Read contract data
skale read --chain europa --address 0x... --abi ./abi.json --method balanceOf --args 0x...
```

## Quick Start

```bash
# List available SKALE chains
skale chains list

# Read contract data
skale read configController version --chain europa

# Check gas prices
skale gas price --chain europa

# View address on explorer
skale explorer address 0x... --chain europa
```

## Global Options

These options work with any command:

| Option | Description |
|--------|-------------|
| `--help, -h` | Show help for the command |
| `--version, -v` | Show CLI version |

## Command Reference

### `chains` — Chain Management

Aggregate portfolio, compare balances, and list supported chains.

#### `chains portfolio <address>`

Aggregate token balances across multiple chains.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Wallet address (0x...) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--token` | string | No | Token contract address for ERC20 balance |
| `--chains` | string | No | Comma-separated chain names (e.g., 'europa,titan,mainnet') |
| `--value-in` | enum | No | Display values in: USD, EUR, ETH |

**Output:**
```json
{
  "address": "0x...",
  "token": null,
  "value-in": null,
  "chains": [
    {
      "chain": "europa",
      "chainName": "Europa Liquidity Hub",
      "type": "skale",
      "status": "online",
      "balance": "1000000000000000000",
      "formatted": "1.0",
      "token": null,
      "explorerUrl": "https://explorer.europa.skale.network/address/0x..."
    }
  ],
  "summary": {
    "totalChains": 10,
    "onlineChains": 9,
    "offlineChains": 1,
    "totalBalance": "5000000000000000000",
    "totalFormatted": "5.0"
  }
}
```

**Examples:**
```bash
skale chains portfolio 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
skale chains portfolio 0x... --chains europa,titan
skale chains portfolio 0x... --token 0x... --value-in USD
```

---

#### `chains compare <address>`

Compare address balance across chains.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Wallet address (0x...) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chains` | string | No | Comma-separated chain names |
| `--format` | enum | No | Output format: text, table, json (default: json) |

**Output:**
```json
{
  "address": "0x...",
  "format": "json",
  "chains": [
    {
      "chain": "europa",
      "chainName": "Europa Liquidity Hub",
      "type": "skale",
      "status": "online",
      "ethBalance": "1000000000000000000",
      "ethBalanceFormatted": "1.0",
      "tokenCount": 0,
      "blockNumber": "12345678"
    }
  ],
  "summary": {
    "totalChains": 10,
    "onlineChains": 9,
    "offlineChains": 1
  }
}
```

**Examples:**
```bash
skale chains compare 0x... --chains europa,titan,mainnet
skale chains compare 0x... --format table
```

---

#### `chains list`

List all supported chains with current status.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--network` | enum | No | Filter by: skale, ethereum, all (default: all) |
| `--status` | boolean | No | Show RPC connection status |

**Output:**
```json
{
  "network": null,
  "chains": [
    {
      "name": "Europa Liquidity Hub",
      "key": "europa",
      "type": "skale",
      "rpcOnline": true,
      "blockNumber": "12345678",
      "error": null
    }
  ]
}
```

**Examples:**
```bash
skale chains list
skale chains list --network skale
skale chains list --status
```

---

### `read` — Contract Reading

Call read-only contract methods on SKALE or Ethereum.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `contractName` | string | Yes | Contract name (see valid options below) |
| `method` | string | Yes | Method name to call |
| `params` | array | No | Method parameters (space-separated) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name (required if not using --network) |
| `--network` | enum | Conditional | Ethereum network: mainnet, sepolia (required if not using --chain) |

**Valid Contracts:**
- **SKALE chains**: `configController`, `messageProxyForSchain`, `tokenManagerERC20`
- **Ethereum**: `messageProxy`, `sklToken`

**Output:**
```json
{
  "contract": { /* Contract instance object */ },
  "address": "0x...",
  "method": "version",
  "result": "1.0.0"
}
```

**Examples:**
```bash
# SKALE chain
skale read configController version --chain europa
skale read configController isAddressWhitelisted 0x... --chain europa
skale read sklToken totalSupply --network mainnet
skale read sklToken balanceOf 0x... --network mainnet
```

---

### `token` — SKL Token

SKL token information and balance queries.

#### `token info`

Get SKL token information.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--network` | enum | No | Ethereum network: mainnet (default: mainnet) |

**Output:**
```json
{
  "name": "SKALE",
  "symbol": "SKL",
  "decimals": 18,
  "totalSupply": "7000000000000000000000000000",
  "address": "0x...",
  "network": "mainnet",
  "networkName": "Ethereum Mainnet"
}
```

---

#### `token balance <address>`

Get SKL token balance for an address.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--network` | enum | No | Ethereum network: mainnet (default: mainnet) |

**Output:**
```json
{
  "address": "0x...",
  "balance": "1000000000000000000",
  "formatted": "1.0",
  "decimals": 18,
  "network": "mainnet",
  "networkName": "Ethereum Mainnet"
}
```

**Examples:**
```bash
skale token balance 0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B
```

---

### `access` — Access Control

Check whitelist status and access control.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address to check |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "address": "0x...",
  "chain": "europa",
  "chainName": "Europa Liquidity Hub",
  "whitelisted": true
}
```

**Examples:**
```bash
skale access 0x... --chain europa
```

---

### `ima` — IMA Bridge

Interchain Messaging Agent (IMA) bridge operations.

#### `ima chain-id`

Get chain ID from MessageProxy contract.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name |
| `--network` | enum | Conditional | Ethereum network: mainnet, sepolia |

**Output:**
```json
{
  "schainHash": "0x...",
  "target": "europa",
  "targetName": "Europa Liquidity Hub",
  "contractAddress": "0x..."
}
```

---

#### `ima connected-chains`

Check if a chain is connected to MessageProxy.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name (source) |
| `--network` | enum | Conditional | Ethereum network (source) |
| `--check-chain` | string | No | Chain name to check connectivity to |

**Output:**
```json
{
  "source": "europa",
  "sourceName": "Europa Liquidity Hub",
  "target": "mainnet",
  "isConnected": true,
  "contractAddress": "0x..."
}
```

---

#### `ima deposit`

Get deposit information for ERC20 tokens.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--network` | enum | Yes | Ethereum network: mainnet, sepolia |
| `--token` | string | Yes | Token address on Ethereum (0x...) |

**Output:**
```json
{
  "token": "0x...",
  "tokenName": "MyToken",
  "tokenSymbol": "MTK",
  "tokenDecimals": 18,
  "chain": "Europa Liquidity Hub",
  "chainId": "europa",
  "network": "Ethereum Mainnet",
  "networkId": "mainnet",
  "automaticDeposit": true,
  "tokenManagerAddress": "0x...",
  "messageProxyAddress": "0x..."
}
```

---

#### `ima withdraw`

Get withdraw information for ERC20 tokens.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--token` | string | Yes | Token address on SKALE chain (0x...) |

**Output:**
```json
{
  "token": "0x...",
  "tokenName": "MyToken",
  "tokenSymbol": "MTK",
  "tokenDecimals": 18,
  "chain": "Europa Liquidity Hub",
  "chainId": "europa",
  "tokenManagerAddress": "0x...",
  "messageProxyAddress": "0x..."
}
```

---

#### `ima monitor-deposits`

Monitor deposit events from Ethereum to SKALE.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--network` | enum | Yes | Ethereum network |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "monitor-deposits",
  "parameters": {
    "chain": "europa",
    "network": "mainnet"
  }
}
```

---

#### `ima monitor-withdrawals`

Monitor withdrawal events from SKALE to Ethereum.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "monitor-withdrawals",
  "parameters": {
    "chain": "europa"
  }
}
```

---

### `manager` — SKALE Manager

SKALE Manager contract interactions.

#### `manager version`

Get ConfigController version.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "version": "1.0.0",
  "chain": "europa",
  "chainName": "Europa Liquidity Hub",
  "contractAddress": "0x..."
}
```

---

#### `manager mtm-status`

Check if Multi-Transaction Mode is enabled.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "mtmEnabled": true,
  "chain": "europa",
  "chainName": "Europa Liquidity Hub"
}
```

---

#### `manager fcd-status`

Check if Free Contract Deployment is enabled.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "fcdEnabled": true,
  "chain": "europa",
  "chainName": "Europa Liquidity Hub"
}
```

---

### `bite` — BITE Encryption

Blockchain Integrated Threshold Encryption (BITE) commands.

#### `bite encrypt-tx`

Encrypt a transaction using BITE.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--to` | string | Yes | Recipient address (0x...) |
| `--data` | string | No | Transaction data as hex string (0x...) |
| `--value` | string | No | ETH value in wei |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "encrypt-tx",
  "parameters": {
    "chain": "europa",
    "to": "0x...",
    "data": "0x...",
    "value": "1000000000000000000"
  }
}
```

---

#### `bite decrypt-tx`

Decrypt transaction data from a tx hash.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--txhash` | string | Yes | Transaction hash (0x...) |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "decrypt-tx",
  "parameters": {
    "chain": "europa",
    "txhash": "0x..."
  },
  "transactionDetails": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000",
    "data": "0x...",
    "chainId": "europa"
  }
}
```

---

#### `bite encrypt-msg`

Encrypt a message using BITE.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--message` | string | Yes | Message to encrypt |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "encrypt-msg",
  "parameters": {
    "chain": "europa",
    "message": "Hello World"
  }
}
```

---

#### `bite decrypt-msg`

Decrypt a BITE encrypted message.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |
| `--ciphertext` | string | Yes | Encrypted message (0x...) |

**Output:**
```json
{
  "message": "Feature coming soon",
  "feature": "decrypt-msg",
  "parameters": {
    "chain": "europa",
    "ciphertext": "0x..."
  }
}
```

---

#### `bite info`

Get BITE protocol info for a chain.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Yes | SKALE chain name |

**Output:**
```json
{
  "chain": "europa",
  "chainName": "Europa Liquidity Hub",
  "biteEnabled": false,
  "committeeInfo": null,
  "blsPublicKey": null,
  "epochId": null
}
```

---

### `txprep` — Transaction Preparation

Prepare and encode transaction data.

#### `txprep encode <method> <params>`

Generate calldata for contract method calls.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | string | Yes | Method signature like 'transfer(address,uint256)' |
| `params` | string | Yes | Comma-separated parameters |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--abi` | string | No | Path to ABI file or contract name |

**Output:**
```json
{
  "method": "transfer(address,uint256)",
  "parameters": ["0x...", "100"],
  "types": ["address", "uint256"],
  "selector": "0xa9059cbb",
  "calldata": "0xa9059cbb000000000000000000000000..."
}
```

**Examples:**
```bash
skale txprep encode 'transfer(address,uint256)' '0x...,100'
```

---

#### `txprep selector <method>`

Get function selector for a method signature.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | string | Yes | Method signature |

**Output:**
```json
{
  "method": "transfer(address,uint256)",
  "selector": "0xa9059cbb",
  "fullKeccak256": "0xa9059cbb..."
}
```

---

#### `txprep encode-param <type> <value>`

Encode parameters for smart contract calls.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Solidity type (address, uint256, bytes32, string, bool, etc.) |
| `value` | string | Yes | Value to encode |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--array` | boolean | No | Treat value as array (comma-separated) |
| `--dynamic` | boolean | No | Mark as dynamic type |

**Output:**
```json
{
  "type": "address",
  "value": "0x...",
  "dynamic": false,
  "encoded": "0x000000000000000000000000..."
}
```

**Examples:**
```bash
skale txprep encode-param address 0x...
skale txprep encode-param uint256 1000
skale txprep encode-param string 'hello world'
skale txprep encode-param address '0x...,0x...' --array
```

---

#### `txprep build-tx <to> <value>`

Build unsigned transaction object.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `to` | string | Yes | Recipient address |
| `value` | string | Yes | Amount in wei (or ETH with --eth flag) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--data` | string | No | Hex string data |
| `--gas-limit` | number | No | Gas limit |
| `--nonce` | number | No | Transaction nonce |
| `--eth` | boolean | No | Treat value as ETH instead of wei (default: false) |
| `--max-fee` | string | No | Max fee in wei |
| `--max-priority-fee` | string | No | Max priority fee in wei |

**Output:**
```json
{
  "transaction": {
    "to": "0x...",
    "value": "1000000000000000000",
    "data": "0x",
    "chainId": 1,
    "gas": "21000",
    "nonce": 0,
    "maxFeePerGas": "20000000000",
    "maxPriorityFeePerGas": "2000000000"
  },
  "serialized": "0x...",
  "raw": "0x..."
}
```

**Examples:**
```bash
skale txprep build-tx 0x... 100 --eth
skale txprep build-tx 0x... 1000000000000000000 --chain calypso
```

---

### `wallet` — Wallet Operations

Wallet management and address utilities.

#### `wallet balance <address>`

Get ETH or token balance for an address.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--token` | string | No | Token contract address for ERC20 balance |

**Output:**
```json
{
  "address": "0x...",
  "balance": "1000000000000000000",
  "formatted": "1.0",
  "chain": "mainnet",
  "chainName": "Ethereum Mainnet"
}
```

**Examples:**
```bash
skale wallet balance 0x... --network sepolia
skale wallet balance 0x... --chain nebula
skale wallet balance 0x... --token 0x...
```

---

#### `wallet validate <address>`

Validate Ethereum address format.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address to validate |

**Output:**
```json
{
  "valid": true,
  "original": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
  "checksummed": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
}
```

---

#### `wallet ens <name>`

Resolve ENS name to address or reverse resolve.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | ENS name or Ethereum address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--network` | enum | No | Ethereum network: mainnet, sepolia (default: mainnet) |
| `--reverse` | boolean | No | Reverse resolution (address to ENS name) |

**Output (forward resolution):**
```json
{
  "address": "0x...",
  "ensName": "vitalik.eth",
  "network": "mainnet"
}
```

**Output (reverse resolution):**
```json
{
  "address": "0x...",
  "ensName": "vitalik.eth",
  "network": "mainnet"
}
```

**Examples:**
```bash
skale wallet ens vitalik.eth
skale wallet ens 0x... --reverse
```

---

#### `wallet address <privateKey>`

Generate derived address from private key (read-only, key is masked).

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `privateKey` | string | Yes | Private key (will be masked in output) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--index` | number | No | Derivation index (default: 0) |
| `--path` | string | No | Derivation path |

**Output:**
```json
{
  "address": "0x...",
  "publicKey": "0x...",
  "index": 0,
  "maskedPrivateKey": "0x12...ab"
}
```

---

#### `wallet explorer <address>`

Show block explorer URL for an address or transaction.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address or transaction hash |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--type` | enum | No | Type: address or tx (auto-detected) |

**Output:**
```json
{
  "address": "0x...",
  "type": "address",
  "url": "https://etherscan.io/address/0x...",
  "chain": "mainnet"
}
```

**Examples:**
```bash
skale wallet explorer 0x... --network sepolia
skale wallet explorer 0x... --chain nebula
skale wallet explorer 0x... --type tx
```

---

### `gas` — Gas Operations

Gas estimation and price queries.

#### `gas estimate <to> <value>`

Estimate gas for a transaction.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `to` | string | Yes | Recipient address |
| `value` | string | Yes | Amount in wei (or ETH with --eth flag) |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--data` | string | No | Hex string data |
| `--from` | string | No | Sender address |
| `--eth` | boolean | No | Treat value as ETH instead of wei |

**Output:**
```json
{
  "estimatedGas": "21000",
  "estimatedGasWithBuffer": "23100",
  "bufferPercent": "10%",
  "currentGasPrice": "20000000000",
  "costEstimate": "462000000000000",
  "costEstimateFormatted": {
    "wei": "462000000000000",
    "ether": "0.000462"
  }
}
```

**Examples:**
```bash
skale gas estimate 0x... 1000000000000000000 --eth --chain calypso
skale gas estimate 0x... 1000000 --network mainnet
```

---

#### `gas price`

Get current gas prices (fast/standard/slow).

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--unit` | enum | No | Unit: gwei, wei (default: gwei) |

**Output:**
```json
{
  "unit": "gwei",
  "current": {
    "slow": "15.5",
    "standard": "20.0",
    "fast": "24.0"
  },
  "raw": {
    "slow": "15500000000",
    "standard": "20000000000",
    "fast": "24000000000"
  },
  "baseFeePerGas": "18000000000",
  "isEIP1559": true
}
```

---

#### `gas history`

Get historical gas prices.

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--hours` | number | No | Hours to look back, max 168 (default: 24) |

**Output:**
```json
{
  "network": "mainnet",
  "hours": 24,
  "currentGasPrice": "20000000000",
  "baseFeePerGas": "18000000000",
  "history": [
    {
      "timestamp": 1704067200000,
      "gasPrice": "19000000000",
      "speed": "current"
    }
  ]
}
```

---

#### `gas simulate <to> <value>`

Simulate transaction without executing (read-only).

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `to` | string | Yes | Recipient address |
| `value` | string | Yes | Amount in wei |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--data` | string | No | Hex string data |
| `--from` | string | No | Sender address |
| `--block` | number | No | Block number to simulate at |

**Output:**
```json
{
  "success": true,
  "simulatedAt": "12345678",
  "transaction": {
    "to": "0x...",
    "value": "1000000000000000000",
    "data": "0x",
    "from": null
  },
  "gasUsed": "21000",
  "gasUsedWithBuffer": "23100",
  "result": null,
  "status": "success"
}
```

---

### `explorer` — Blockchain Explorer

Query blockchain data and generate explorer URLs.

#### `explorer tx <hash>`

Get transaction details and construct explorer URL.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `hash` | string | Yes | Transaction hash |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |

**Output:**
```json
{
  "hash": "0x...",
  "status": "success",
  "blockNumber": "12345678",
  "blockHash": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "formattedValue": "1.0",
  "gasUsed": "21000",
  "gasPrice": "20000000000",
  "formattedGasPrice": "0.00000002",
  "inputData": "0x",
  "transactionIndex": "0",
  "chain": "mainnet",
  "chainName": "Ethereum Mainnet",
  "explorerUrl": "https://etherscan.io/tx/0x..."
}
```

---

#### `explorer address <address>`

Get address details and explorer URL.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Ethereum address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |

**Output:**
```json
{
  "address": "0x...",
  "type": "EOA",
  "balance": "1000000000000000000",
  "formattedBalance": "1.0",
  "transactionCount": "42",
  "codeVerified": "not-a-contract",
  "code": null,
  "chain": "mainnet",
  "chainName": "Ethereum Mainnet",
  "explorerUrl": "https://etherscan.io/address/0x..."
}
```

---

#### `explorer block <block>`

Get block details and explorer URL.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `block` | string | Yes | Block number or hash |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--hash` | boolean | No | Input is block hash instead of number |

**Output:**
```json
{
  "number": "12345678",
  "hash": "0x...",
  "parentHash": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "transactionsCount": "150",
  "gasUsed": "15000000",
  "gasLimit": "30000000",
  "miner": "0x...",
  "size": "45000",
  "difficulty": "0",
  "totalDifficulty": "12345678901234567890",
  "chain": "mainnet",
  "chainName": "Ethereum Mainnet",
  "explorerUrl": "https://etherscan.io/block/12345678"
}
```

---

#### `explorer contract <address>`

Get contract info and explorer URL.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Contract address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | No | SKALE chain name |
| `--network` | enum | No | Ethereum network: mainnet, sepolia |
| `--verify` | boolean | No | Check verification status |

**Output:**
```json
{
  "address": "0x...",
  "type": "Contract",
  "hasCode": true,
  "codeVerification": "has-code",
  "codeLength": "24576",
  "chain": "mainnet",
  "chainName": "Ethereum Mainnet",
  "explorerUrl": "https://etherscan.io/address/0x...",
  "codeExplorerUrl": "https://etherscan.io/address/0x...#code"
}
```

---

### `contract` — Contract Inspection

Inspect and analyze smart contracts.

#### `contract source <address>`

Check contract source code information.

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Contract address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name (required if not using --network) |
| `--network` | enum | Conditional | Ethereum network: mainnet, sepolia (required if not using --chain) |

**Output:**
```json
{
  "address": "0x...",
  "isContract": true,
  "codeSizeBytes": "24576",
  "verificationNote": "Contract verification status cannot be queried via RPC...",
  "explorerUrl": "https://explorer.nebula.skale.network/address/0x...",
  "chain": "nebula",
  "chainName": "Nebula Gaming Hub"
}
```

---

#### `contract standards <address>`

Check ERC standard compliance (ERC20, ERC721, ERC165).

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Contract address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name |
| `--network` | enum | Conditional | Ethereum network |

**Output:**
```json
{
  "address": "0x...",
  "chain": "nebula",
  "chainName": "Nebula Gaming Hub",
  "detectedStandards": ["ERC20", "ERC165"],
  "erc20": {
    "methods": ["name", "symbol", "decimals", "totalSupply", "balanceOf", "transfer", "approve", "allowance"]
  },
  "erc721": null,
  "erc165": true,
  "complianceScore": 150,
  "hasCode": true
}
```

---

#### `contract interface <address>`

Get contract interface details (read/write functions and events).

**Arguments:**
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `address` | string | Yes | Contract address |

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--chain` | enum | Conditional | SKALE chain name |
| `--network` | enum | Conditional | Ethereum network |
| `--output-format` | enum | No | Output format: text, json, abi (default: text) |

**Output (text format):**
```json
{
  "address": "0x...",
  "chain": "nebula",
  "chainName": "Nebula Gaming Hub",
  "outputFormat": "text",
  "readFunctionsCount": 5,
  "writeFunctionsCount": 3,
  "eventsCount": 2,
  "readFunctions": ["name", "symbol", "decimals", "totalSupply", "balanceOf"],
  "writeFunctions": ["transfer", "approve", "transferFrom"],
  "events": ["Transfer", "Approval"]
}
```

**Output (abi format):**
```json
{
  "address": "0x...",
  "chain": "nebula",
  "chainName": "Nebula Gaming Hub",
  "outputFormat": "abi",
  "abi": [
    { "type": "function", "name": "name", "stateMutability": "view", "inputs": [], "outputs": [] },
    { "type": "function", "name": "transfer", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
    { "type": "event", "name": "Transfer", "inputs": [] }
  ]
}
```

---

## Environment Setup

Create a `.env` file or export environment variables:

```bash
export PRIVATE_KEY=your_private_key
export RPC_URL=https://your-rpc-url
```

## Supported Chains

### SKALE Chains
- `europa` — Europa Liquidity Hub
- `calypso` — Calypso Hub
- `nebula` — Nebula Gaming Hub
- `titan` — Titan AI Hub
- `strayshot` — StrayShot
- `skale-base` — SKALE Base
- `calypso-testnet` — Calypso Testnet
- `europa-testnet` — Europa Testnet
- `nebula-testnet` — Nebula Testnet
- `titan-testnet` — Titan Testnet
- `skale-base-sepolia` — SKALE Base Sepolia

### Ethereum Networks
- `mainnet` — Ethereum Mainnet
- `sepolia` — Ethereum Sepolia Testnet

## Documentation

- [SKALE Developer Documentation](https://docs.skale.network/)
- [SKALE Network Website](https://skale.space/)

## License

MIT © SKALE Labs
