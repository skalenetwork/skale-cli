import { Cli, z } from "incur"
import { ethers } from "ethers"
import { skaleChains, skaleChainKeys, ethereumNetworks, ethereumNetworkKeys, type SkaleChain, type EthereumNetwork } from "../chains.js"
import { getSkaleContract, getEthereumContract, createContractInstance } from "../contracts/index.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])
const ethereumNetworkEnum = z.enum(ethereumNetworkKeys as [string, ...string[]])

const skaleContractEnum = z.enum(["configController", "messageProxyForSchain", "tokenManagerERC20"])
const ethereumContractEnum = z.enum(["messageProxy", "sklToken"])

export const read = Cli
  .create("read", {
    description: "Call a read-only contract method",
    args: z.object({
      contractName: z.string().describe("Contract name"),
      method: z.string().describe("Method name to call"),
      params: z.array(z.string()).optional().describe("Method parameters"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
    }),
    usage: [
      "read <contract> <method> [params...] --chain <chain>",
      "read <contract> <method> [params...] --network <network>",
    ],
    examples: [
      { command: "read configController version --chain europa", description: "Get ConfigController version" },
      { command: "read sklToken totalSupply --network mainnet", description: "Get SKL total supply" },
    ],
    async run(c) {
      const { contractName, method, params = [] } = c.args
      const { chain, network } = c.options

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
          cta: { command: "read --help", description: "View usage examples" },
        })
      }

      let contractConfig: { address: string; abi: ethers.InterfaceAbi }
      let provider: ethers.JsonRpcProvider

      if (chain) {
        const chainConfig = skaleChains[chain as SkaleChain]
        provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)

        if (!skaleContractEnum.options.includes(contractName as any)) {
          return c.error({
            code: "INVALID_CONTRACT",
            message: `Unknown SKALE contract: ${contractName}. Valid: ${skaleContractEnum.options.join(", ")}`,
          })
        }
        contractConfig = getSkaleContract(contractName as "configController" | "messageProxyForSchain" | "tokenManagerERC20")
      } else {
        const networkConfig = ethereumNetworks[network as EthereumNetwork]
        provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl)

        if (!ethereumContractEnum.options.includes(contractName as any)) {
          return c.error({
            code: "INVALID_CONTRACT",
            message: `Unknown Ethereum contract: ${contractName}. Valid: ${ethereumContractEnum.options.join(", ")}`,
          })
        }
        contractConfig = getEthereumContract(network as EthereumNetwork, contractName as "messageProxy" | "sklToken")
      }

      const contract = createContractInstance(provider, contractConfig)

      if (!contract[method]) {
        return c.error({
          code: "INVALID_METHOD",
          message: `Method "${method}" not found on contract ${contract}`,
        })
      }

      // Parse params (convert string values to appropriate types)
      const parsedParams = params.map(p => {
        if (p === "true") return true
        if (p === "false") return false
        if (/^\d+$/.test(p)) return BigInt(p)
        if (p.startsWith("0x")) return p
        return p
      })

      try {
        const result = await contract[method](...parsedParams)
        return c.ok({
          contract,
          address: contractConfig.address,
          method,
          result: typeof result === "bigint" ? result.toString() : result,
        })
      } catch (err) {
        return c.error({
          code: "CALL_FAILED",
          message: err instanceof Error ? err.message : "Contract call failed",
        })
      }
    },
  })
