import { Cli, z } from "incur"
import { createPublicClient, http, type PublicClient } from "viem"
import { skaleChains, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"
import { getSkaleContract, getEthereumContract, createContractInstance } from "../contracts/index.js"
import { skaleChainKeys, ethereumNetworkKeys } from "../chains.js"
import type { Abi } from "viem"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])
const ethereumNetworkEnum = z.enum(ethereumNetworkKeys as [string, ...string[]])

export const ima = Cli
  .create("ima", {
    description: "IMA bridge commands",
  })
  .command("chain-id", {
    description: "Get chain ID from MessageProxy contract",
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "ima chain-id --chain europa", description: "Get SKALE chain ID" },
      { command: "ima chain-id --network mainnet", description: "Get Ethereum mainnet chain ID" },
    ],
    async run(c) {
      const { chain, network } = c.options

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      let contractConfig: { address: string; abi: Abi }
      let client: PublicClient
      let targetName: string

      if (chain) {
        const chainConfig = skaleChains[chain as SkaleChain]
        client = createPublicClient({ transport: http(chainConfig.rpcUrl) })
        contractConfig = getSkaleContract("messageProxyForSchain")
        targetName = chainConfig.name
      } else {
        const networkConfig = ethereumNetworks[network as EthereumNetwork]
        client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
        contractConfig = getEthereumContract(network as EthereumNetwork, "messageProxy")
        targetName = networkConfig.name
      }

      const contract = createContractInstance(client, contractConfig)
      const chainId = await contract.read.getChainId()

      return c.ok({
        chainId,
        target: chain ?? network,
        targetName,
        contractAddress: contractConfig.address,
      })
    },
  })
  .command("connected-chains", {
    description: "Get connected chains from MessageProxy",
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "ima connected-chains --chain europa", description: "Get chains connected to Europa" },
    ],
    async run(c) {
      const { chain, network } = c.options

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      let contractConfig: { address: string; abi: Abi }
      let client: PublicClient
      let targetName: string

      if (chain) {
        const chainConfig = skaleChains[chain as SkaleChain]
        client = createPublicClient({ transport: http(chainConfig.rpcUrl) })
        contractConfig = getSkaleContract("messageProxyForSchain")
        targetName = chainConfig.name
      } else {
        const networkConfig = ethereumNetworks[network as EthereumNetwork]
        client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
        contractConfig = getEthereumContract(network as EthereumNetwork, "messageProxy")
        targetName = networkConfig.name
      }

      const contract = createContractInstance(client, contractConfig)
      const chains = await contract.read.getConnectedChains()

      return c.ok({
        chains,
        count: chains.length,
        target: chain ?? network,
        targetName,
        contractAddress: contractConfig.address,
      })
    },
  })
  .command("deposit", {
    description: "Get deposit information for ERC20 tokens",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      network: ethereumNetworkEnum.describe("Ethereum network (mainnet or sepolia)"),
      token: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Token address on Ethereum"),
    }),
    examples: [
      { command: "ima deposit --token 0xTokenAddress --chain europa --network mainnet", description: "Get deposit info for token" },
    ],
    async run(c) {
      const { chain, network, token } = c.options

      const chainConfig = skaleChains[chain as SkaleChain]
      const networkConfig = ethereumNetworks[network as EthereumNetwork]

      const ethClient = createPublicClient({ transport: http(networkConfig.rpcUrl) })
      const skaleClient = createPublicClient({ transport: http(chainConfig.rpcUrl) })

      const tokenManagerConfig = getSkaleContract("tokenManagerERC20")
      const tokenManager = createContractInstance(skaleClient, tokenManagerConfig)

      const isTokenRegistered = await tokenManager.read.isTokenRegistered([token])
      if (!isTokenRegistered) {
        return c.error({
          code: "TOKEN_NOT_REGISTERED",
          message: `Token ${token} is not registered on ${chainConfig.name}`,
        })
      }

      const ethToken = createContractInstance(ethClient, { address: token, abi: tokenManagerConfig.abi })
      const name = await ethToken.read.name().catch(() => "Unknown")
      const symbol = await ethToken.read.symbol().catch(() => "Unknown")
      const decimals = await ethToken.read.decimals().catch(() => 18)

      const [
        automaticDeploy,
        gasPrice,
      ] = await Promise.all([
        tokenManager.read.automaticDeploy().catch(() => false),
        tokenManager.read.gasPrice().catch(() => "0"),
      ])

      return c.ok({
        token,
        tokenName: name,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        chain: chainConfig.name,
        chainId: chain,
        network: networkConfig.name,
        networkId: network,
        automaticDeposit: automaticDeploy,
        gasPrice,
        tokenManagerAddress: tokenManagerConfig.address,
        messageProxyAddress: tokenManagerConfig.address.replace("D2aAA005", "d2AAa001"),
      })
    },
  })
  .command("withdraw", {
    description: "Get withdraw information for ERC20 tokens",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      token: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Token address on SKALE chain"),
    }),
    examples: [
      { command: "ima withdraw --token 0xTokenAddress --chain europa", description: "Get withdraw info for token" },
    ],
    async run(c) {
      const { chain, token } = c.options

      const chainConfig = skaleChains[chain as SkaleChain]
      const client = createPublicClient({ transport: http(chainConfig.rpcUrl) })

      const tokenManagerConfig = getSkaleContract("tokenManagerERC20")
      const tokenManager = createContractInstance(client, tokenManagerConfig)

      const isTokenRegistered = await tokenManager.read.isTokenRegistered([token])
      if (!isTokenRegistered) {
        return c.error({
          code: "TOKEN_NOT_REGISTERED",
          message: `Token ${token} is not registered on ${chainConfig.name}`,
        })
      }

      const tokenContract = createContractInstance(client, { address: token, abi: tokenManagerConfig.abi })
      const name = await tokenContract.read.name().catch(() => "Unknown")
      const symbol = await tokenContract.read.symbol().catch(() => "Unknown")
      const decimals = await tokenContract.read.decimals().catch(() => 18)

      return c.ok({
        token,
        tokenName: name,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        chain: chainConfig.name,
        chainId: chain,
        tokenManagerAddress: tokenManagerConfig.address,
        messageProxyAddress: tokenManagerConfig.address.replace("D2aAA005", "d2AAa001"),
      })
    },
  })
  .command("monitor-deposits", {
    description: "Monitor deposit events from Ethereum to SKALE",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      network: ethereumNetworkEnum.describe("Ethereum network"),
    }),
    examples: [
      { command: "ima monitor-deposits --chain europa --network mainnet", description: "Monitor deposits to Europa" },
    ],
    async run(c) {
      const { chain, network } = c.options

      return c.ok({
        message: "Feature coming soon",
        feature: "monitor-deposits",
        description: "This will monitor deposit events from Ethereum to SKALE",
        parameters: {
          chain,
          network,
        },
      })
    },
  })
  .command("monitor-withdrawals", {
    description: "Monitor withdrawal events from SKALE to Ethereum",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { command: "ima monitor-withdrawals --chain europa", description: "Monitor withdrawals from Europa" },
    ],
    async run(c) {
      const { chain } = c.options

      return c.ok({
        message: "Feature coming soon",
        feature: "monitor-withdrawals",
        description: "This will monitor withdrawal events from SKALE to Ethereum",
        parameters: {
          chain,
        },
      })
    },
  })
