import { Cli, z } from "incur"
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  formatEther,
  isHex,
  type PublicClient,
  type Chain,
  type Transport,
} from "viem"
import { skaleChains, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"

function getChainConfig(chainOrNetwork?: string) {
  if (chainOrNetwork && chainOrNetwork in skaleChains) {
    return {
      config: skaleChains[chainOrNetwork as SkaleChain],
      type: "skale" as const,
    }
  }
  if (chainOrNetwork && chainOrNetwork in ethereumNetworks) {
    return {
      config: ethereumNetworks[chainOrNetwork as EthereumNetwork],
      type: "ethereum" as const,
    }
  }
  return null
}

function createClient(chainOrNetwork?: string): PublicClient<Transport, Chain> {
  const chainConfig = getChainConfig(chainOrNetwork ?? undefined)

  if (chainConfig) {
    const rpcUrl = chainConfig.config.rpcUrl
    return createPublicClient({
      transport: http(rpcUrl),
      chain: {
        id: 0,
        name: chainConfig.config.name,
        nativeCurrency: { name: "SKL", symbol: "SKL", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
    }) as PublicClient<Transport, Chain>
  }

  return createPublicClient({
    transport: http(ethereumNetworks.mainnet.rpcUrl),
    chain: {
      id: 1,
      name: "Ethereum Mainnet",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [ethereumNetworks.mainnet.rpcUrl] } },
    },
  }) as PublicClient<Transport, Chain>
}

function getExplorerUrl(
  path: string,
  chain?: string,
  network?: string
): string {
  if (chain && chain in skaleChains) {
    return `https://explorer.${chain}.skale.network/${path}`
  }

  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/${path}`
  }

  return `https://etherscan.io/${path}`
}

export const explorer = Cli
  .create("explorer", {
    description: "Blockchain explorer commands",
  })
  .command("tx", {
    description: "Get transaction details and construct explorer URL",
    args: z.object({
      hash: z.string().describe("Transaction hash"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "explorer tx 0x...", description: "Get transaction details on mainnet" },
      { command: "explorer tx 0x... --network sepolia", description: "Get transaction details on Sepolia" },
      { command: "explorer tx 0x... --chain nebula", description: "Get transaction details on Nebula" },
    ],
    async run(c) {
      const { hash } = c.args
      const { chain, network } = c.options

      if (!isHex(hash)) {
        return c.error({
          code: "INVALID_HASH",
          message: "Invalid transaction hash format",
        })
      }

      const chainName = chain && chain in skaleChains 
        ? skaleChains[chain as keyof typeof skaleChains].name 
        : network && network in ethereumNetworks 
          ? ethereumNetworks[network as keyof typeof ethereumNetworks].name 
          : ethereumNetworks.mainnet.name
      const client = createClient(chain ?? network ?? undefined)

      try {
        const hashHex = hash as `0x${string}`
        const [tx, receipt] = await Promise.all([
          client.getTransaction({ hash: hashHex }),
          client.getTransactionReceipt({ hash: hashHex }),
        ])

        const block = tx.blockNumber 
          ? await client.getBlock({ blockNumber: tx.blockNumber })
          : null

        return c.ok({
          hash: tx.hash,
          status: receipt.status === "success" ? "success" : "failed",
          blockNumber: tx.blockNumber?.toString() ?? null,
          blockHash: tx.blockHash ?? null,
          timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          formattedValue: formatEther(tx.value),
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: tx.gasPrice.toString(),
          formattedGasPrice: formatEther(tx.gasPrice),
          inputData: tx.input,
          transactionIndex: receipt.transactionIndex.toString(),
          chain: chain || network || "mainnet",
          chainName,
          explorerUrl: getExplorerUrl(`tx/${hash}`, chain, network),
        })
      } catch (error) {
        return c.error({
          code: "TRANSACTION_NOT_FOUND",
          message: `Transaction not found: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
  .command("address", {
    description: "Get address details and explorer URL",
    args: z.object({
      address: z.string().describe("Ethereum address"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "explorer address 0x...", description: "Get address details on mainnet" },
      { command: "explorer address 0x... --network sepolia", description: "Get address details on Sepolia" },
      { command: "explorer address 0x... --chain nebula", description: "Get address details on Nebula" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const chainName = chain && chain in skaleChains 
        ? skaleChains[chain as keyof typeof skaleChains].name 
        : network && network in ethereumNetworks 
          ? ethereumNetworks[network as keyof typeof ethereumNetworks].name 
          : ethereumNetworks.mainnet.name
      const client = createClient(chain ?? network ?? undefined)

      try {
        const addressHex = address as `0x${string}`
        let code: string = "0x"
        let balance: bigint = 0n
        let txCount: number = 0

        try {
          code = await client.getCode({ address: addressHex })
        } catch (e) {
          code = "0x"
        }

        try {
          balance = await client.getBalance({ address: addressHex })
        } catch (e) {
          balance = 0n
        }

        try {
          txCount = await client.getTransactionCount({ address: addressHex })
        } catch (e) {
          txCount = 0
        }

        const isContract = code !== "0x"

        const codeVerifiedValue = !isContract 
          ? "not-a-contract" 
          : (code && code.length > 2) ? "has-code" : "no-code"

        return c.ok({
          address: getAddress(address),
          type: isContract ? "Contract" : "EOA",
          balance: balance.toString(),
          formattedBalance: formatEther(balance),
          transactionCount: txCount.toString(),
          codeVerified: codeVerifiedValue,
          code: isContract ? code : null,
          chain: chain || network || "mainnet",
          chainName,
          explorerUrl: getExplorerUrl(`address/${address}`, chain, network),
        })
      } catch (error) {
        return c.error({
          code: "ADDRESS_QUERY_ERROR",
          message: `Error querying address: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
  .command("block", {
    description: "Get block details and explorer URL",
    args: z.object({
      block: z.string().describe("Block number or hash"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      hash: z.boolean().default(false).describe("Input is block hash instead of number"),
    }),
    examples: [
      { command: "explorer block 19000000", description: "Get block details by number on mainnet" },
      { command: "explorer block 0x... --hash", description: "Get block details by hash" },
      { command: "explorer block 19000000 --network sepolia", description: "Get block details on Sepolia" },
      { command: "explorer block 19000000 --chain nebula", description: "Get block details on Nebula" },
    ],
    async run(c) {
      const { block } = c.args
      const { chain, network, hash: isHash } = c.options

      const chainName = chain && chain in skaleChains 
        ? skaleChains[chain as keyof typeof skaleChains].name 
        : network && network in ethereumNetworks 
          ? ethereumNetworks[network as keyof typeof ethereumNetworks].name 
          : ethereumNetworks.mainnet.name
      const client = createClient(chain ?? network ?? undefined)

      try {
        let blockNumberOrHash: bigint | `0x${string}`

        if (isHash) {
          if (!isHex(block)) {
            return c.error({
              code: "INVALID_BLOCK_HASH",
              message: "Invalid block hash format",
            })
          }
          blockNumberOrHash = block as `0x${string}`
        } else {
          const num = parseInt(block, 10)
          if (isNaN(num)) {
            return c.error({
              code: "INVALID_BLOCK_NUMBER",
              message: "Invalid block number format",
            })
          }
          blockNumberOrHash = BigInt(num)
        }

        const [blockData, txCount] = await Promise.all([
          client.getBlock({ blockNumberOrHash }),
          client.getBlockTransactionCount({ blockNumberOrHash }),
        ])

        return c.ok({
          number: blockData.number?.toString() ?? null,
          hash: blockData.hash ?? null,
          parentHash: blockData.parentHash,
          timestamp: blockData.timestamp ? new Date(Number(blockData.timestamp) * 1000).toISOString() : null,
          transactionsCount: txCount.toString(),
          gasUsed: blockData.gasUsed.toString(),
          gasLimit: blockData.gasLimit.toString(),
          miner: blockData.miner,
          size: blockData.size?.toString() ?? null,
          difficulty: blockData.difficulty?.toString() ?? null,
          totalDifficulty: blockData.totalDifficulty?.toString() ?? null,
          chain: chain || network || "mainnet",
          chainName,
          explorerUrl: getExplorerUrl(`block/${isHash ? block : blockData.number}`, chain, network),
        })
      } catch (error) {
        return c.error({
          code: "BLOCK_NOT_FOUND",
          message: `Block not found: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
  .command("contract", {
    description: "Get contract info and explorer URL",
    args: z.object({
      address: z.string().describe("Contract address"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      verify: z.boolean().default(false).describe("Check verification status"),
    }),
    examples: [
      { command: "explorer contract 0x...", description: "Get contract info on mainnet" },
      { command: "explorer contract 0x... --verify", description: "Check contract verification status" },
      { command: "explorer contract 0x... --network sepolia", description: "Get contract info on Sepolia" },
      { command: "explorer contract 0x... --chain nebula", description: "Get contract info on Nebula" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network, verify } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const chainName = chain && chain in skaleChains 
        ? skaleChains[chain as keyof typeof skaleChains].name 
        : network && network in ethereumNetworks 
          ? ethereumNetworks[network as keyof typeof ethereumNetworks].name 
          : ethereumNetworks.mainnet.name
      const client = createClient(chain ?? network ?? undefined)

      try {
        const addressHex = address as `0x${string}`
        const code = await client.getCode({ address: addressHex })

        if (code === "0x") {
          return c.error({
            code: "NOT_A_CONTRACT",
            message: "Address does not contain contract code",
          })
        }

        let hasCode = true
        let codeLength = 0

        if (verify) {
          codeLength = code.length > 2 ? (code.length - 2) / 2 : 0
        }

        return c.ok({
          address: getAddress(address),
          type: "Contract",
          hasCode: true,
          codeVerification: hasCode ? "has-code" : "no-code",
          codeLength: codeLength > 0 ? codeLength.toString() : "0",
          chain: chain || network || "mainnet",
          chainName,
          explorerUrl: getExplorerUrl(`address/${address}`, chain, network),
          codeExplorerUrl: getExplorerUrl(`address/${address}#code`, chain, network),
        })
      } catch (error) {
        return c.error({
          code: "CONTRACT_QUERY_ERROR",
          message: `Error querying contract: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
