import { Cli, z } from "incur"
import { ethers } from "ethers"
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
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
      const contractConfig = getEthereumContract(network as EthereumNetwork, "sklToken")
      const contract = createContractInstance(provider, contractConfig)

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
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

      if (!ethers.isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const networkConfig = ethereumNetworks[network as EthereumNetwork]
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)
      const contractConfig = getEthereumContract(network as EthereumNetwork, "sklToken")
      const contract = createContractInstance(provider, contractConfig)

      const balance = await contract.balanceOf(address)
      const decimals = await contract.decimals()
      const formatted = ethers.formatUnits(balance, decimals)

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
