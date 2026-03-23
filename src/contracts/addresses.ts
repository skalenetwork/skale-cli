// SKALE predeployed addresses (same on all SKALE chains)
const SKALE_PREDEPLOYED = {
  messageProxyForSchain: '0xd2AAa00100000000000000000000000000000000',
  tokenManagerERC20: '0xD2aAA00500000000000000000000000000000000',
  tokenManagerLinker: '0xD2aAA00800000000000000000000000000000000',
  tokenManagerEth: '0xd2AaA00400000000000000000000000000000000',
  communityLocker: '0xD2aaa00300000000000000000000000000000000',
  configController: '0xD2002000000000000000000000000000000000d2',
}

export const ADDRESSES = {
  mainnet: {
    messageProxy: '0x2C3cae1A2143De33F7fe887ad0428d33BBBd0A62',
    sklToken: '0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7',
  },
  sepolia: {
    messageProxy: '0x682ef859e1cE314ceD13A6FA32cE77AaeCE98e28',
  },
  skale: SKALE_PREDEPLOYED,
} as const

export type AddressNetwork = keyof typeof ADDRESSES
export type EthereumNetwork = 'mainnet' | 'sepolia'
