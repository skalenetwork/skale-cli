import { Cli, z } from "incur"
import { createPublicClient, http, getContract, type PublicClient } from "viem"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"
import { getSkaleContract } from "../contracts/index.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])

function createClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    transport: http(rpcUrl),
  })
}

function createContractInstance(
  client: PublicClient,
  address: string,
  abi: readonly unknown[]
) {
  return getContract({
    address: address as `0x${string}`,
    abi: abi as never,
    client,
  })
}

export const manager = Cli
  .create("manager", {
    description: "SKALE Manager contract commands",
  })
  .command("version", {
    description: "Get ConfigController version",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { command: "manager version --chain europa", description: "Get manager version on Europa" },
    ],
    async run(c) {
      const { chain } = c.options
      const chainConfig = skaleChains[chain as SkaleChain]

      const client = createClient(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(client, contractConfig.address, contractConfig.abi)

      const version = await contract.read.version()

      return c.ok({
        version,
        chain,
        chainName: chainConfig.name,
        contractAddress: contractConfig.address,
      })
    },
  })
  .command("mtm-status", {
    description: "Check if Multi-Transaction Mode is enabled",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    async run(c) {
      const { chain } = c.options
      const chainConfig = skaleChains[chain as SkaleChain]

      const client = createClient(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(client, contractConfig.address, contractConfig.abi)

      const isMTMEnabled = await contract.read.isMTMEnabled()

      return c.ok({
        mtmEnabled: isMTMEnabled,
        chain,
        chainName: chainConfig.name,
      })
    },
  })
  .command("fcd-status", {
    description: "Check if Free Contract Deployment is enabled",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    async run(c) {
      const { chain } = c.options
      const chainConfig = skaleChains[chain as SkaleChain]

      const client = createClient(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(client, contractConfig.address, contractConfig.abi)

      const isFCDEnabled = await contract.read.isFCDEnabled()

      return c.ok({
        fcdEnabled: isFCDEnabled,
        chain,
        chainName: chainConfig.name,
      })
    },
  })
