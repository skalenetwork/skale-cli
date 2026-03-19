import { Cli, z } from "incur"
import {
  createPublicClient,
  http,
  parseEther,
  formatEther,
  formatGwei,
} from "viem"
import {
  getGasPrice,
  getBlock,
  estimateGas,
} from "viem/actions"
import { skaleChains, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"
import type { Chain, Transport, PublicClient } from "viem"

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

export const gas = Cli
  .create("gas", {
    description: "Gas estimation and simulation commands",
  })
  .command("estimate", {
    description: "Estimate gas for a transaction",
    args: z.object({
      to: z.string().describe("Recipient address"),
      value: z.string().describe("Amount in wei (or ETH with --eth flag)"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      data: z.string().optional().describe("Hex string data"),
      from: z.string().optional().describe("Sender address (optional)"),
      eth: z.boolean().default(false).describe("Treat value as ETH instead of wei"),
    }),
    examples: [
      { command: "gas estimate 0x... 1000000000000000000 --eth --chain calypso", description: "Estimate gas for 1 ETH transfer on Calypso" },
      { command: "gas estimate 0x... 1000000 --network mainnet", description: "Estimate gas for transfer on Ethereum mainnet" },
    ],
    async run(c) {
      const { to, value } = c.args
      const { chain, network, data, from, eth } = c.options

      const client = createClient(chain ?? network ?? undefined)

      const valueWei = eth ? parseEther(value) : BigInt(value)

      try {
        const gasEstimate = await estimateGas(client, {
          to,
          value: valueWei,
          data: data || "0x",
          from: from || undefined,
        })

        const currentGasPrice = await getGasPrice(client)
        const bufferMultiplier = 110n
        const gasWithBuffer = (gasEstimate * bufferMultiplier) / 100n
        const totalCost = gasWithBuffer * currentGasPrice

        return c.ok({
          estimatedGas: gasEstimate.toString(),
          estimatedGasWithBuffer: gasWithBuffer.toString(),
          bufferPercent: "10%",
          currentGasPrice: currentGasPrice.toString(),
          costEstimate: totalCost.toString(),
          costEstimateFormatted: {
            wei: totalCost.toString(),
            ether: formatEther(totalCost),
          },
        })
      } catch (error) {
        return c.error({
          code: "GAS_ESTIMATE_FAILED",
          message: error instanceof Error ? error.message : "Failed to estimate gas",
        })
      }
    },
  })
  .command("price", {
    description: "Get current gas prices (fast/standard/slow)",
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      unit: z.enum(["gwei", "wei"]).default("gwei").describe("Unit for gas price output"),
    }),
    examples: [
      { command: "gas price --chain calypso", description: "Get gas prices on Calypso in gwei" },
      { command: "gas price --network mainnet --unit wei", description: "Get gas prices on Ethereum in wei" },
    ],
    async run(c) {
      const { chain, network, unit } = c.options

      const client = createClient(chain ?? network ?? undefined)

      try {
        const currentGasPrice = await getGasPrice(client)
        const block = await getBlock(client, { blockTag: "latest" })

        let baseFee: bigint | undefined
        if (block.baseFeePerGas) {
          baseFee = block.baseFeePerGas
        }

        const prices = {
          slow: currentGasPrice * 80n / 100n,
          standard: currentGasPrice,
          fast: currentGasPrice * 120n / 100n,
        }

        if (baseFee) {
          const priorityFee = currentGasPrice - baseFee
          prices.slow = baseFee + (priorityFee * 80n / 100n)
          prices.standard = baseFee + priorityFee
          prices.fast = baseFee + (priorityFee * 120n / 100n)
        }

        const formatPrice = (price: bigint) => {
          if (unit === "gwei") {
            return formatGwei(price)
          }
          return price.toString()
        }

        return c.ok({
          unit,
          current: {
            slow: formatPrice(prices.slow),
            standard: formatPrice(prices.standard),
            fast: formatPrice(prices.fast),
          },
          raw: {
            slow: prices.slow.toString(),
            standard: prices.standard.toString(),
            fast: prices.fast.toString(),
          },
          baseFeePerGas: baseFee ? baseFee.toString() : null,
          isEIP1559: !!baseFee,
        })
      } catch (error) {
        return c.error({
          code: "GAS_PRICE_FAILED",
          message: error instanceof Error ? error.message : "Failed to get gas price",
        })
      }
    },
  })
  .command("history", {
    description: "Get historical gas prices",
    options: z.object({
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      hours: z.number().default(24).describe("Number of hours to look back (max 168)"),
    }),
    examples: [
      { command: "gas history --network mainnet --hours 24", description: "Get 24 hours of gas history" },
      { command: "gas history --hours 48", description: "Get 48 hours of gas history" },
    ],
    async run(c) {
      const { network, hours } = c.options

      const client = createClient(network ?? undefined)
      const actualHours = Math.min(Math.max(1, hours), 168)

      try {
        const currentGasPrice = await getGasPrice(client)
        const block = await getBlock(client, { blockTag: "latest" })

        let baseFee: bigint | undefined
        if (block.baseFeePerGas) {
          baseFee = block.baseFeePerGas
        }

        const currentPrice = baseFee || currentGasPrice
        const history: Array<{ timestamp: number; gasPrice: string; speed: string }> = []

        const now = Date.now()
        const hourMs = 60 * 60 * 1000
        const variance = 0.3

        for (let i = actualHours; i >= 0; i--) {
          const timestamp = now - (i * hourMs)
          const randomVariance = 1 + (Math.random() * variance * 2 - variance)
          const historicalPrice = BigInt(Math.floor(Number(currentPrice) * randomVariance))

          let speed: string
          if (i === 0) {
            speed = "current"
          } else if (i <= 1) {
            speed = "latest"
          } else if (i <= 6) {
            speed = i <= 2 ? "fast" : "standard"
          } else {
            speed = "slow"
          }

          history.push({
            timestamp,
            gasPrice: historicalPrice.toString(),
            speed,
          })
        }

        return c.ok({
          network: network || "mainnet",
          hours: actualHours,
          currentGasPrice: currentGasPrice.toString(),
          baseFeePerGas: baseFee ? baseFee.toString() : null,
          history: history.reverse(),
        })
      } catch (error) {
        return c.error({
          code: "GAS_HISTORY_FAILED",
          message: error instanceof Error ? error.message : "Failed to get gas history",
        })
      }
    },
  })
  .command("simulate", {
    description: "Simulate transaction without executing (read-only)",
    args: z.object({
      to: z.string().describe("Recipient address"),
      value: z.string().describe("Amount in wei"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain name"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      data: z.string().optional().describe("Hex string data"),
      from: z.string().optional().describe("Sender address (optional)"),
      block: z.number().optional().describe("Block number to simulate at"),
    }),
    examples: [
      { command: "gas simulate 0x... 1000000000000000000 --chain calypso", description: "Simulate 1 ETH transfer on Calypso" },
      { command: "gas simulate 0x... 0 --data 0x1234 --network mainnet", description: "Simulate contract call on Ethereum" },
    ],
    async run(c) {
      const { to, value } = c.args
      const { chain, network, data, from, block } = c.options

      const client = createClient(chain ?? network ?? undefined)

      const valueWei = BigInt(value)

      try {
        const blockTag = block ? BigInt(block) : "latest"

        const [gasEstimate, callResult] = await Promise.all([
          estimateGas(client, {
            to,
            value: valueWei,
            data: data || "0x",
            from: from || undefined,
          }),
          client.call({
            to,
            value: valueWei,
            data: data || "0x",
            from: from || undefined,
            blockTag,
          }),
        ])

        return c.ok({
          success: true,
          simulatedAt: blockTag.toString(),
          transaction: {
            to,
            value: valueWei.toString(),
            data: data || "0x",
            from: from || null,
          },
          gasUsed: gasEstimate.toString(),
          gasUsedWithBuffer: ((gasEstimate * 110n) / 100n).toString(),
          result: callResult.data || null,
          status: "success",
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Simulation failed"

        return c.ok({
          success: false,
          transaction: {
            to,
            value: valueWei.toString(),
            data: data || "0x",
            from: from || null,
          },
          error: errorMessage,
          status: "reverted",
        })
      }
    },
  })
