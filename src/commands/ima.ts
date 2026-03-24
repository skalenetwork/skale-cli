import { Cli, z } from "incur"
import { createPublicClient, http, type PublicClient, erc20Abi, getContract } from "viem"
import { skaleChains, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"
import { skaleChainKeys, ethereumNetworkKeys } from "../chains.js"
import { ADDRESSES } from "../contracts/addresses.js"
import tokenManagerERC20Abi from "../abis/tokenManagerERC20.abi.json" with { type: "json" }
import messageProxyAbi from "../abis/messageProxy.abi.json" with { type: "json" }

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])
const ethereumNetworkEnum = z.enum(ethereumNetworkKeys as [string, ...string[]])

function createImaContract(client: PublicClient, abi: unknown, address: string) {
  return getContract({
    address: address as `0x${string}`,
    abi: abi as unknown[],
    client,
  })
}

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

      let client: PublicClient
      let targetName: string
      let contractAddress: string

      if (chain) {
        const chainConfig = skaleChains[chain as SkaleChain]
        client = createPublicClient({ transport: http(chainConfig.rpcUrl) })
        contractAddress = ADDRESSES.skale.messageProxyForSchain
        targetName = chainConfig.name
      } else {
        const networkConfig = ethereumNetworks[network as EthereumNetwork]
        client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
        contractAddress = ADDRESSES[network as EthereumNetwork].messageProxy
        targetName = networkConfig.name
      }

      const contract = createImaContract(client, messageProxyAbi, contractAddress)
      
      if (chain) {
        // For sChain, get the schainHash
        const schainHash = await contract.read.schainHash()
        return c.ok({
          schainHash,
          target: chain,
          targetName,
          contractAddress,
        })
      } else {
        // For mainnet, return the network info (no direct chain ID function)
        return c.ok({
          target: network,
          targetName,
          contractAddress,
          note: "Mainnet MessageProxy does not have a schainHash function",
        })
      }
    },
  })
  .command("connected-chains", {
    description: "Check if a chain is connected to MessageProxy",
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name (source)"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network (source)"),
      "check-chain": z.string().optional().describe("Chain name to check connectivity to (e.g., 'mainnet' or 'europa')"),
    }),
    examples: [
      { command: "ima connected-chains --chain europa --check-chain mainnet", description: "Check if Europa is connected to mainnet" },
    ],
    async run(c) {
      const { chain, network, "check-chain": checkChain } = c.options

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      let client: PublicClient
      let targetName: string
      let contractAddress: string

      if (chain) {
        const chainConfig = skaleChains[chain as SkaleChain]
        client = createPublicClient({ transport: http(chainConfig.rpcUrl) })
        contractAddress = ADDRESSES.skale.messageProxyForSchain
        targetName = chainConfig.name
      } else {
        const networkConfig = ethereumNetworks[network as EthereumNetwork]
        client = createPublicClient({ transport: http(networkConfig.rpcUrl) })
        contractAddress = ADDRESSES[network as EthereumNetwork].messageProxy
        targetName = networkConfig.name
      }

      const contract = createImaContract(client, messageProxyAbi, contractAddress)
      
      // Check connectivity to the specified chain
      const chainToCheck = checkChain || (chain ? "mainnet" : "europa")
      const isConnected = await contract.read.isConnectedChain([chainToCheck]).catch(() => false)
      
      return c.ok({
        source: chain ?? network,
        sourceName: targetName,
        target: chainToCheck,
        isConnected,
        contractAddress,
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

      const tokenManager = createImaContract(skaleClient, tokenManagerERC20Abi, ADDRESSES.skale.tokenManagerERC20)

      const ethToken = { address: token as `0x${string}`, abi: erc20Abi }
      const name = await ethClient.readContract({ ...ethToken, functionName: "name" }).catch(() => "Unknown")
      const symbol = await ethClient.readContract({ ...ethToken, functionName: "symbol" }).catch(() => "Unknown")
      const decimals = await ethClient.readContract({ ...ethToken, functionName: "decimals" }).catch(() => 18)

      const automaticDeploy = await tokenManager.read.automaticDeploy().catch(() => false)

      const tokenManagerAddress = ADDRESSES.skale.tokenManagerERC20

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
        tokenManagerAddress,
        messageProxyAddress: tokenManagerAddress.replace("D2aAA005", "d2AAa001"),
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

      const tokenManager = createImaContract(client, tokenManagerERC20Abi, ADDRESSES.skale.tokenManagerERC20)

      const tokenContract = { address: token as `0x${string}`, abi: erc20Abi }
      const name = await client.readContract({ ...tokenContract, functionName: "name" }).catch(() => "Unknown")
      const symbol = await client.readContract({ ...tokenContract, functionName: "symbol" }).catch(() => "Unknown")
      const decimals = await client.readContract({ ...tokenContract, functionName: "decimals" }).catch(() => 18)

      const tokenManagerAddress = ADDRESSES.skale.tokenManagerERC20

      return c.ok({
        token,
        tokenName: name,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        chain: chainConfig.name,
        chainId: chain,
        tokenManagerAddress,
        messageProxyAddress: tokenManagerAddress.replace("D2aAA005", "d2AAa001"),
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
