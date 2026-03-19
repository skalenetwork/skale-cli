// SKALE predeployed addresses (same on all SKALE chains)
const SKALE_PREDEPLOYED = {
  messageProxyForSchain: '0xd2AAa00100000000000000000000000000000000',
  tokenManagerERC20: '0xD2aAA00500000000000000000000000000000000',
  configController: '0xD2002000000000000000000000000000000000d2',
}

export const ADDRESSES = {
  mainnet: {
    messageProxy: '0x8629703a9903515818C2FeB45a6f6fA5df8Da404',
    sklToken: '0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7',
  },
  sepolia: {
    messageProxy: '0x682ef859e1cE314ceD13A6FA32cE77AaeCE98e28',
  },
  skale: SKALE_PREDEPLOYED,
} as const

export type AddressNetwork = keyof typeof ADDRESSES
export type EthereumNetwork = 'mainnet' | 'sepolia'
