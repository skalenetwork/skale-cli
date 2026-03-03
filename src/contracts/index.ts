import { ethers } from "ethers"
import { ADDRESSES } from "./addresses.js"
import type { ContractConfig } from "./types.js"

import configControllerAbi from "../abis/configController.abi.json" with { type: "json" }
import messageProxyAbi from "../abis/messageProxy.abi.json" with { type: "json" }
import tokenManagerERC20Abi from "../abis/tokenManagerERC20.abi.json" with { type: "json" }
import erc20Abi from "../abis/erc20.abi.json" with { type: "json" }

const ABIS = {
  configController: configControllerAbi,
  messageProxy: messageProxyAbi,
  messageProxyForSchain: messageProxyAbi, // Same ABI
  tokenManagerERC20: tokenManagerERC20Abi,
  sklToken: erc20Abi,
} as const

type SkaleContract = 'configController' | 'messageProxyForSchain' | 'tokenManagerERC20'
type EthereumContract = 'messageProxy' | 'sklToken'

export function getSkaleContract(name: SkaleContract): ContractConfig {
  const address = ADDRESSES.skale[name]
  if (!address) throw new Error(`Unknown SKALE contract: ${name}`)
  const abi = ABIS[name]
  if (!abi) throw new Error(`Missing ABI for contract: ${name}`)
  return { address, abi }
}

export function getEthereumContract(
  network: 'mainnet' | 'holesky',
  name: EthereumContract
): ContractConfig {
  const networkAddresses = ADDRESSES[network]
  if (!networkAddresses) throw new Error(`Unknown network: ${network}`)

  const address = (networkAddresses as Record<string, string>)[name]
  if (!address) throw new Error(`Contract ${name} not available on ${network}`)

  const abi = ABIS[name as keyof typeof ABIS]
  if (!abi) throw new Error(`Missing ABI for contract: ${name}`)

  return { address, abi }
}

export function createContractInstance(
  provider: ethers.JsonRpcProvider,
  config: ContractConfig
): ethers.Contract {
  return new ethers.Contract(config.address, config.abi, provider)
}
