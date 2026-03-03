import type { ethers } from "ethers"

export type ContractConfig = {
  address: string
  abi: ethers.InterfaceAbi
}
