import { Cli, z } from "incur"
import {
  createPublicClient,
  http,
  isAddress,
  formatEther,
  type PublicClient,
} from "viem"
import { getBlock } from "viem/actions"
import {
  skaleChains,
  skaleChainKeys,
  ethereumNetworks,
  ethereumNetworkKeys,
  type SkaleChain,
  type EthereumNetwork,
} from "../chains.js"

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
  },
] as const

function getExplorerUrl(address: string, chain: string, network?: string): string {
  if (chain && chain in skaleChains) {
    return `https://explorer.${chain}.skale.network/address/${address}`
  }

  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/address/${address}`
  }

  return `https://etherscan.io/address/${address}`
}

interface ChainConfig {
  rpcUrl: string
  name: string
}

async function getBalance(
  client: PublicClient,
  address: string,
  token?: string
): Promise<{ balance: bigint; formatted: string; token?: { symbol: string; decimals: number } }> {
  if (token) {
    const [balance, symbol, decimals] = await Promise.all([
      client.readContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      }),
      client
        .readContract({
          address: token as `0x${string}`,
          abi: [
            {
              name: "symbol",
              type: "function",
              inputs: [],
              outputs: [{ name: "", type: "string" }],
              stateMutability: "view",
            },
          ],
          functionName: "symbol",
          args: [],
        })
        .catch(() => "UNKNOWN"),
      client
        .readContract({
          address: token as `0x${string}`,
          abi: [
            {
              name: "decimals",
              type: "function",
              inputs: [],
              outputs: [{ name: "", type: "uint8" }],
              stateMutability: "view",
            },
          ],
          functionName: "decimals",
          args: [],
        })
        .catch(() => 18n),
    ])

    return {
      balance,
      formatted: formatEther(balance),
      token: { symbol: symbol as string, decimals: Number(decimals) },
    }
  }

  const balance = await client.getBalance({ address })
  return { balance, formatted: formatEther(balance) }
}

async function testRpcConnection(rpcUrl: string): Promise<{ online: boolean; blockNumber?: bigint; error?: string }> {
  try {
    const client = createPublicClient({ transport: http(rpcUrl), timeout: 5000 })
    const block = await getBlock(client, { blockTag: "latest" })
    return { online: true, blockNumber: block.number }
  } catch (err) {
    return { online: false, error: err instanceof Error ? err.message : "Connection failed" }
  }
}

function getAllChains(): Array<{ key: string; config: ChainConfig; type: "skale" | "ethereum" }> {
  const chains: Array<{ key: string; config: ChainConfig; type: "skale" | "ethereum" }> = []

  for (const key of skaleChainKeys) {
    chains.push({ key, config: skaleChains[key], type: "skale" })
  }

  for (const key of ethereumNetworkKeys) {
    chains.push({ key, config: ethereumNetworks[key], type: "ethereum" })
  }

  return chains
}

function parseChainsOption(chainsStr?: string): string[] | undefined {
  if (!chainsStr) return undefined
  return chainsStr.split(",").map((c) => c.trim().toLowerCase())
}

export const chains = Cli.create("chains", {
  description: "Chain commands - portfolio, compare, and list chains",
})
  .command("portfolio", {
    description: "Aggregate token balances across multiple chains",
    args: z.object({
      address: z.string().describe("Wallet address"),
    }),
    options: z.object({
      token: z.string().optional().describe("Token contract address for ERC20 balance"),
      chains: z.string().optional().describe("Comma-separated chain names (e.g., 'europa,titan,mainnet')"),
      "value-in": z.enum(["USD", "EUR", "ETH"]).optional().describe("Display values in currency"),
    }),
    examples: [
      { command: "chains portfolio 0x...", description: "Get portfolio across all chains" },
      { command: "chains portfolio 0x... --chains europa,titan", description: "Get portfolio for specific chains" },
      { command: "chains portfolio 0x... --token 0x...", description: "Get ERC20 balance across chains" },
    ],
    async run(c) {
      const { address, options } = c.args
      const { token, chains: chainsStr, "value-in": valueIn } = options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      if (token && !isAddress(token)) {
        return c.error({
          code: "INVALID_TOKEN_ADDRESS",
          message: "Invalid token contract address",
        })
      }

      const selectedChains = parseChainsOption(chainsStr)
      const allChains = getAllChains()

      const chainsToQuery = selectedChains
        ? allChains.filter((ch) => selectedChains.includes(ch.key) || selectedChains.includes(ch.key.replace(/-/g, "")))
        : allChains

      if (chainsToQuery.length === 0) {
        return c.error({
          code: "NO_CHAINS",
          message: "No valid chains specified",
        })
      }

      const results = await Promise.all(
        chainsToQuery.map(async (chainInfo) => {
          try {
            const client = createPublicClient({ transport: http(chainInfo.config.rpcUrl), timeout: 10000 })
            const balanceResult = await getBalance(client, address, token)
            const explorerUrl = getExplorerUrl(address, chainInfo.key, chainInfo.type === "ethereum" ? chainInfo.key : undefined)

            return {
              chain: chainInfo.key,
              chainName: chainInfo.config.name,
              type: chainInfo.type,
              status: "online" as const,
              balance: balanceResult.balance.toString(),
              formatted: balanceResult.formatted,
              token: balanceResult.token,
              explorerUrl,
            }
          } catch {
            return {
              chain: chainInfo.key,
              chainName: chainInfo.config.name,
              type: chainInfo.type,
              status: "offline" as const,
              balance: "0",
              formatted: "0",
              explorerUrl: null,
            }
          }
        })
      )

      const onlineResults = results.filter((r) => r.status === "online")
      const totalBalance = onlineResults.reduce((sum, r) => sum + BigInt(r.balance), 0n)
      const totalFormatted = formatEther(totalBalance)

      return c.ok({
        address,
        token: token || null,
        "value-in": valueIn || null,
        chains: results,
        summary: {
          totalChains: results.length,
          onlineChains: onlineResults.length,
          offlineChains: results.length - onlineResults.length,
          totalBalance: totalBalance.toString(),
          totalFormatted,
        },
      })
    },
  })
  .command("compare", {
    description: "Compare address balance across chains",
    args: z.object({
      address: z.string().describe("Wallet address"),
    }),
    options: z.object({
      chains: z.string().optional().describe("Comma-separated chain names"),
      format: z.enum(["text", "table", "json"]).default("json").describe("Output format"),
    }),
    examples: [
      { command: "chains compare 0x...", description: "Compare balance across all chains" },
      { command: "chains compare 0x... --chains europa,titan,mainnet", description: "Compare on specific chains" },
      { command: "chains compare 0x... --format table", description: "Show results in table format" },
    ],
    async run(c) {
      const { address, options } = c.args
      const { chains: chainsStr, format } = options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const selectedChains = parseChainsOption(chainsStr)
      const allChains = getAllChains()

      const chainsToQuery = selectedChains
        ? allChains.filter((ch) => selectedChains.includes(ch.key) || selectedChains.includes(ch.key.replace(/-/g, "")))
        : allChains

      if (chainsToQuery.length === 0) {
        return c.error({
          code: "NO_CHAINS",
          message: "No valid chains specified",
        })
      }

      const results = await Promise.all(
        chainsToQuery.map(async (chainInfo) => {
          const connectionTest = await testRpcConnection(chainInfo.config.rpcUrl)

          if (!connectionTest.online) {
            return {
              chain: chainInfo.key,
              chainName: chainInfo.config.name,
              type: chainInfo.type,
              status: "offline" as const,
              ethBalance: "0",
              ethBalanceFormatted: "0",
              tokenCount: 0,
              error: connectionTest.error,
            }
          }

          try {
            const client = createPublicClient({ transport: http(chainInfo.config.rpcUrl), timeout: 10000 })
            const balance = await client.getBalance({ address })

            return {
              chain: chainInfo.key,
              chainName: chainInfo.config.name,
              type: chainInfo.type,
              status: "online" as const,
              ethBalance: balance.toString(),
              ethBalanceFormatted: formatEther(balance),
              tokenCount: 0,
              blockNumber: connectionTest.blockNumber?.toString(),
            }
          } catch (err) {
            return {
              chain: chainInfo.key,
              chainName: chainInfo.config.name,
              type: chainInfo.type,
              status: "offline" as const,
              ethBalance: "0",
              ethBalanceFormatted: "0",
              tokenCount: 0,
              error: err instanceof Error ? err.message : "Failed to get balance",
            }
          }
        })
      )

      const onlineCount = results.filter((r) => r.status === "online").length

      if (format === "text") {
        let textOutput = `Address: ${address}\n\n`
        for (const result of results) {
          const statusIcon = result.status === "online" ? "●" : "○"
          textOutput += `${statusIcon} ${result.chainName} (${result.chain}): ${result.ethBalanceFormatted} ETH\n`
        }
        textOutput += `\nOnline: ${onlineCount}/${results.length} chains`

        return c.ok({ text: textOutput })
      }

      return c.ok({
        address,
        format,
        chains: results,
        summary: {
          totalChains: results.length,
          onlineChains: onlineCount,
          offlineChains: results.length - onlineCount,
        },
      })
    },
  })
  .command("list", {
    description: "List all supported chains with current status",
    options: z.object({
      network: z.enum(["skale", "ethereum", "all"]).default("all").describe("Filter by network type"),
      status: z.boolean().default(false).describe("Show RPC connection status"),
    }),
    examples: [
      { command: "chains list", description: "List all supported chains" },
      { command: "chains list --network skale", description: "List only SKALE chains" },
      { command: "chains list --status", description: "Show RPC connection status" },
    ],
    async run(c) {
      const { network, status } = c.options

      let chainsToList = getAllChains()

      if (network === "skale") {
        chainsToList = chainsToList.filter((ch) => ch.type === "skale")
      } else if (network === "ethereum") {
        chainsToList = chainsToList.filter((ch) => ch.type === "ethereum")
      }

      if (status) {
        const results = await Promise.all(
          chainsToList.map(async (chainInfo) => {
            const connectionTest = await testRpcConnection(chainInfo.config.rpcUrl)

            return {
              name: chainInfo.config.name,
              key: chainInfo.key,
              type: chainInfo.type,
              rpcOnline: connectionTest.online,
              blockNumber: connectionTest.blockNumber?.toString() || null,
              error: connectionTest.error || null,
            }
          })
        )

        return c.ok({
          network: network === "all" ? null : network,
          chains: results,
        })
      }

      return c.ok({
        network: network === "all" ? null : network,
        chains: chainsToList.map((ch) => ({
          name: ch.config.name,
          key: ch.key,
          type: ch.type,
        })),
      })
    },
  })
