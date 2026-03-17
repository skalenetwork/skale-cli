const MAINNET_RPC_URL_BASE = "https://mainnet.skalenodes.com/v1"
const TESTNET_RPC_URL_BASE = "https://testnet.skalenodes.com/v1"

export const skaleChains = {
  calypso: {
    rpcUrl: `${MAINNET_RPC_URL_BASE}/honorable-steel-rasalhague`,
    name: "Calypso",
  },
  europa: {
    rpcUrl: `${MAINNET_RPC_URL_BASE}/elated-tan-skat`,
    name: "Europa",
  },
  nebula: {
    rpcUrl: `${MAINNET_RPC_URL_BASE}/green-giddy-denebola`,
    name: "Nebula",
  },
  titan: {
    rpcUrl: `${MAINNET_RPC_URL_BASE}/parallel-stormy-spica`,
    name: "Titan",
  },
  strayshot: {
    rpcUrl: `${MAINNET_RPC_URL_BASE}/fussy-smoggy-megrez`,
    name: "StrayShot",
  },
  base: {
    rpcUrl: "https://skale-base.skalenodes.com/v1/base",
    name: "SKALE Base",
  },
  "calypso-testnet": {
    rpcUrl: `${TESTNET_RPC_URL_BASE}/giant-half-dual-testnet`,
    name: "Calypso Testnet",
  },
  "europa-testnet": {
    rpcUrl: `${TESTNET_RPC_URL_BASE}/juicy-low-small-testnet`,
    name: "Europa Testnet",
  },
  "nebula-testnet": {
    rpcUrl: `${TESTNET_RPC_URL_BASE}/lanky-ill-funny-testnet`,
    name: "Nebula Testnet",
  },
  "titan-testnet": {
    rpcUrl: `${TESTNET_RPC_URL_BASE}/aware-fake-trim-testnet`,
    name: "Titan Testnet",
  },
  "base-testnet": {
    rpcUrl: "https://base-sepolia-testnet.skalenodes.com/v1/base-testnet",
    name: "SKALE Base Testnet",
  },
} as const

export const ethereumNetworks = {
  mainnet: {
    rpcUrl: process.env.ETHEREUM_RPC_URL ?? "https://eth.llamarpc.com",
    name: "Ethereum Mainnet",
  },
  holesky: {
    rpcUrl: process.env.HOLESKY_RPC_URL ?? "https://ethereum-holesky.publicnode.com",
    name: "Holesky",
  },
} as const

export const skaleChainKeys = Object.keys(skaleChains) as (keyof typeof skaleChains)[]
export const ethereumNetworkKeys = Object.keys(ethereumNetworks) as (keyof typeof ethereumNetworks)[]

export type SkaleChain = keyof typeof skaleChains
export type EthereumNetwork = keyof typeof ethereumNetworks
