import { Cli, z } from "incur"
import { ethers } from "ethers"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"
import { getSkaleContract, createContractInstance } from "../contracts/index.js"

const chainEnum = z.enum(skaleChainKeys as [string, ...string[]])

export const whitelist = Cli
  .create("whitelist", {
    description: "Check if an Ethereum address is whitelisted on a SKALE chain",
    args: z.object({
      address: z.string().describe("Ethereum address to check"),
    }),
    options: z.object({
      chain: chainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { command: "whitelist 0x... --chain europa", description: "Check if address is whitelisted on Europa" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain } = c.options

      if (!ethers.isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const chainConfig = skaleChains[chain as SkaleChain]
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(provider, contractConfig)

      const isWhitelisted = await contract.isAddressWhitelisted(address)

      return c.ok({
        address,
        chain,
        chainName: chainConfig.name,
        whitelisted: isWhitelisted,
      })
    },
  })
