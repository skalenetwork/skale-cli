import { Cli, z } from "incur"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"
import { getSkaleContract, createContractInstance } from "../contracts/index.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])

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

      const { ethers } = await import("ethers")
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(provider, contractConfig)

      const version = await contract.version()

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

      const { ethers } = await import("ethers")
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(provider, contractConfig)

      const isMTMEnabled = await contract.isMTMEnabled()

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

      const { ethers } = await import("ethers")
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl)
      const contractConfig = getSkaleContract("configController")
      const contract = createContractInstance(provider, contractConfig)

      const isFCDEnabled = await contract.isFCDEnabled()

      return c.ok({
        fcdEnabled: isFCDEnabled,
        chain,
        chainName: chainConfig.name,
      })
    },
  })
