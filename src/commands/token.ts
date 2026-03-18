import { Cli, z } from "incur"
import { createPublicClient, http, isAddress, formatEther, type PublicClient } from "viem"
import { ethereumNetworks, type EthereumNetwork } from "../chains.js"
import { getEthereumContract, createContractInstance } from "../contracts/index.js"

export const token = Cli
  .create("token", {
    description: "Token commands",
  })
  .command("info", {
    description: "Get SKL token information",
    options: z.object({
      network: z.enum(["mainnet"]).default("mainnet").describe("Ethereum network"),
    }),
    async run(c) {
      const { network } = c.options
      const networkConfig = ethereumNetworks[network as EthereumNetwork]
      const client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
      const contractConfig = getEthereumContract(network as EthereumNetwork, "sklToken")
      const contract = createContractInstance(client, contractConfig)

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.decimals(),
        contract.read.totalSupply(),
      ])

      return c.ok({
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
        address: contractConfig.address,
        network,
        networkName: networkConfig.name,
      })
    },
  })
  .command("balance", {
    description: "Get SKL token balance for an address",
    args: z.object({
      address: z.string().describe("Ethereum address"),
    }),
    options: z.object({
      network: z.enum(["mainnet"]).default("mainnet").describe("Ethereum network"),
    }),
    examples: [
      { command: "token balance 0x...", description: "Get SKL balance for address" },
    ],
    async run(c) {
      const { address } = c.args
      const { network } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const networkConfig = ethereumNetworks[network as EthereumNetwork]
      const client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
      const contractConfig = getEthereumContract(network as EthereumNetwork, "sklToken")
      const contract = createContractInstance(client, contractConfig)

      const [balance, decimals] = await Promise.all([
        contract.read.balanceOf([address]),
        contract.read.decimals(),
      ])

      const formatted = formatEther(balance)

      return c.ok({
        address,
        balance: balance.toString(),
        formatted,
        decimals: Number(decimals),
        network,
        networkName: networkConfig.name,
      })
    },
  })
