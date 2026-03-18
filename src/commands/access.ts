import { Cli, z } from "incur"
import { createPublicClient, http, isAddress, type PublicClient } from "viem"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"
import { getSkaleContract, createContractInstance } from "../contracts/index.js"

const chainEnum = z.enum(skaleChainKeys as [string, ...string[]])

export const access = Cli
  .create("access", {
    description: "Access control commands",
    args: z.object({
      address: z.string().describe("Ethereum address to check"),
    }),
    options: z.object({
      chain: chainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { command: "access 0x... --chain europa", description: "Check if address is whitelisted on Europa" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      const chainConfig = skaleChains[chain as SkaleChain]
      const client: PublicClient = createPublicClient({ transport: http(chainConfig.rpcUrl) })
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(client, contractConfig)

      const isWhitelisted = await contract.read.isAddressWhitelisted([address])

      return c.ok({
        address,
        chain,
        chainName: chainConfig.name,
        whitelisted: isWhitelisted,
      })
    },
  })
