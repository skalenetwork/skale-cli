import { Cli, z } from "incur"
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  formatEther,
  type PublicClient,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { skaleChains, skaleChainKeys, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"
import { getEthereumContract, createContractInstance } from "../contracts/index.js"

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
  },
] as const

function getExplorerUrl(
  address: string,
  type: "address" | "tx",
  chain?: string,
  network?: string
): string {
  if (chain && chain in skaleChains) {
    return `https://explorer.${chain}.skale.network/${type}/${address}`
  }

  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/${type}/${address}`
  }

  return `https://etherscan.io/${type}/${address}`
}

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])

export const wallet = Cli
  .create("wallet", {
    description: "Wallet commands",
  })
  .command("balance", {
    description: "Get ETH or token balance for an address",
    args: z.object({
      address: z.string().describe("Ethereum address"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      token: z.string().optional().describe("Token contract address for ERC20 balance"),
    }),
    examples: [
      { command: "wallet balance 0x...", description: "Get ETH balance on mainnet" },
      { command: "wallet balance 0x... --network sepolia", description: "Get ETH balance on Sepolia" },
      { command: "wallet balance 0x... --chain nebula", description: "Get ETH balance on Nebula" },
      { command: "wallet balance 0x... --token 0x...", description: "Get token balance" },
    ],
    async run(c) {
      const { address: rawAddress } = c.args
      const { chain, network, token } = c.options

      // Normalize to lowercase first
      const address = rawAddress.toLowerCase()

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const checksummedAddress = getAddress(address)

      let rpcUrl: string
      let chainName: string

      if (chain && chain in skaleChains) {
        rpcUrl = skaleChains[chain as keyof typeof skaleChains].rpcUrl
        chainName = skaleChains[chain as keyof typeof skaleChains].name
      } else if (network && network in ethereumNetworks) {
        rpcUrl = ethereumNetworks[network as keyof typeof ethereumNetworks].rpcUrl
        chainName = ethereumNetworks[network as keyof typeof ethereumNetworks].name
      } else {
        rpcUrl = ethereumNetworks.mainnet.rpcUrl
        chainName = ethereumNetworks.mainnet.name
      }

      const client = createPublicClient({ transport: http(rpcUrl) })

      if (token) {
        if (!isAddress(token)) {
          return c.error({
            code: "INVALID_TOKEN_ADDRESS",
            message: "Invalid token contract address",
          })
        }

        const contract = {
          address: token as `0x${string}`,
          abi: ERC20_ABI,
        }

        const [balance, symbol, decimals] = await Promise.all([
          client.readContract({
            ...contract,
            functionName: "balanceOf",
            args: [checksummedAddress],
          }),
          client.readContract({
            address: token as `0x${string}`,
            abi: [{ name: "symbol", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" }],
            functionName: "symbol",
            args: [],
          }).catch(() => "UNKNOWN"),
          client.readContract({
            address: token as `0x${string}`,
            abi: [{ name: "decimals", type: "function", inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" }],
            functionName: "decimals",
            args: [],
          }).catch(() => 18n),
        ])

        return c.ok({
          address: checksummedAddress,
          balance: balance.toString(),
          formatted: formatEther(balance),
          token: {
            address: token,
            symbol: symbol as string,
            decimals: Number(decimals),
          },
          chain: chain || network || "mainnet",
          chainName,
        })
      }

      const balance = await client.getBalance({ address: checksummedAddress })

      return c.ok({
        address: checksummedAddress,
        balance: balance.toString(),
        formatted: formatEther(balance),
        chain: chain || network || "mainnet",
        chainName,
      })
    },
  })
  .command("validate", {
    description: "Validate Ethereum address format",
    args: z.object({
      address: z.string().describe("Ethereum address to validate"),
    }),
    examples: [
      { command: "wallet validate 0x...", description: "Validate an Ethereum address" },
    ],
    async run(c) {
      const { address } = c.args

      const valid = isAddress(address)

      if (!valid) {
        return c.ok({
          valid: false,
          original: address,
          checksummed: null,
        })
      }

      const checksummed = getAddress(address)

      return c.ok({
        valid: true,
        original: address,
        checksummed,
      })
    },
  })
  .command("ens", {
    description: "Resolve ENS name to Ethereum address or reverse resolve",
    args: z.object({
      name: z.string().describe("ENS name or Ethereum address"),
    }),
    options: z.object({
      network: z.enum(["mainnet", "sepolia"]).default("mainnet").describe("Ethereum network"),
      reverse: z.boolean().default(false).describe("Reverse resolution (address to ENS name)"),
    }),
    examples: [
      { command: "wallet ens vitalik.eth", description: "Resolve ENS name to address" },
      { command: "wallet ens 0x... --reverse", description: "Reverse resolve address to ENS name" },
    ],
    async run(c) {
      const { name } = c.args
      const { network, reverse } = c.options

      const networkConfig = ethereumNetworks[network as EthereumNetwork]
      const client = createPublicClient({ transport: http(networkConfig.rpcUrl) })

      if (reverse) {
        if (!isAddress(name)) {
          return c.error({
            code: "INVALID_ADDRESS",
            message: "Invalid Ethereum address for reverse resolution",
          })
        }

        try {
          const ensName = await client.getEnsName({ address: name as `0x${string}` })

          return c.ok({
            address: name,
            ensName: ensName,
            network,
          })
        } catch {
          return c.ok({
            address: name,
            ensName: null,
            network,
          })
        }
      }

      try {
        const address = await client.getEnsAddress({ name })

        if (!address) {
          return c.error({
            code: "ENS_NOT_RESOLVED",
            message: "ENS name could not be resolved",
          })
        }

        return c.ok({
          name,
          address,
          network,
        })
      } catch {
        return c.error({
          code: "ENS_RESOLUTION_ERROR",
          message: "Error resolving ENS name",
        })
      }
    },
  })
  .command("address", {
    description: "Generate derived address from private key (read-only)",
    args: z.object({
      privateKey: z.string().describe("Private key (will be masked in output)"),
    }),
    options: z.object({
      index: z.number().default(0).describe("Derivation index"),
      path: z.string().optional().describe("Derivation path"),
    }),
    examples: [
      { command: "wallet address 0x...", description: "Get address from private key" },
      { command: "wallet address 0x... --index 5", description: "Get address at derivation index 5" },
    ],
    async run(c) {
      const { privateKey } = c.args
      const { index, path } = c.options

      let keyToUse: `0x${string}`

      try {
        if (privateKey.startsWith("0x")) {
          keyToUse = privateKey as `0x${string}`
        } else {
          keyToUse = `0x${privateKey}` as `0x${string}`
        }

        if (keyToUse.length !== 66) {
          return c.error({
            code: "INVALID_PRIVATE_KEY",
            message: "Private key must be 64 hex characters (32 bytes)",
          })
        }
      } catch {
        return c.error({
          code: "INVALID_PRIVATE_KEY",
          message: "Invalid private key format",
        })
      }

      let derivedAddress: string

      if (path && index > 0) {
        return c.error({
          code: "INVALID_OPTIONS",
          message: "Cannot use both path and index options",
        })
      }

      if (path) {
        return c.error({
          code: "NOT_IMPLEMENTED",
          message: "Custom derivation path not yet implemented",
        })
      }

      const account = privateKeyToAccount(keyToUse)
      derivedAddress = account.address

      const publicKey = account.publicKey

      return c.ok({
        address: derivedAddress,
        publicKey,
        index,
        maskedPrivateKey: `${keyToUse.slice(0, 6)}...${keyToUse.slice(-4)}`,
      })
    },
  })
  .command("explorer", {
    description: "Show block explorer URL for an address or transaction",
    args: z.object({
      address: z.string().describe("Ethereum address or transaction hash"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      type: z.enum(["address", "tx"]).optional().describe("Type: address or tx (auto-detected)"),
    }),
    examples: [
      { command: "wallet explorer 0x...", description: "Get explorer URL for address" },
      { command: "wallet explorer 0x... --network sepolia", description: "Get Sepolia explorer URL" },
      { command: "wallet explorer 0x... --chain nebula", description: "Get Nebula explorer URL" },
      { command: "wallet explorer 0x... --type tx", description: "Get explorer URL for transaction" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network, type } = c.options

      let inputType: "address" | "tx"

      if (type) {
        inputType = type
      } else if (address.startsWith("0x") && address.length === 66) {
        inputType = "tx"
      } else {
        inputType = "address"
      }

      if (inputType === "address" && !isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const explorerUrl = getExplorerUrl(address, inputType, chain, network)

      return c.ok({
        address: inputType === "address" ? address : undefined,
        txHash: inputType === "tx" ? address : undefined,
        type: inputType,
        url: explorerUrl,
        chain: chain || network || "mainnet",
      })
    },
  })
