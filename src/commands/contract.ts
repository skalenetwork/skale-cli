import { Cli, z } from "incur"
import { createPublicClient, http, isAddress, getAddress, type PublicClient, type Chain, type Transport } from "viem"
import { skaleChains, skaleChainKeys, ethereumNetworks, ethereumNetworkKeys, type SkaleChain, type EthereumNetwork } from "../chains.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])
const ethereumNetworkEnum = z.enum(ethereumNetworkKeys as [string, ...string[]])

function getChainConfig(chainOrNetwork?: string) {
  if (chainOrNetwork && chainOrNetwork in skaleChains) {
    return {
      config: skaleChains[chainOrNetwork as SkaleChain],
      type: "skale" as const,
    }
  }
  if (chainOrNetwork && chainOrNetwork in ethereumNetworks) {
    return {
      config: ethereumNetworks[chainOrNetwork as EthereumNetwork],
      type: "ethereum" as const,
    }
  }
  return null
}

function createClient(chainOrNetwork?: string): PublicClient<Transport, Chain> {
  const chainConfig = getChainConfig(chainOrNetwork ?? undefined)

  if (chainConfig) {
    const rpcUrl = chainConfig.config.rpcUrl
    return createPublicClient({
      transport: http(rpcUrl),
      chain: {
        id: 0,
        name: chainConfig.config.name,
        nativeCurrency: { name: "SKL", symbol: "SKL", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
    }) as PublicClient<Transport, Chain>
  }

  return createPublicClient({
    transport: http(ethereumNetworks.mainnet.rpcUrl),
    chain: {
      id: 1,
      name: "Ethereum Mainnet",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [ethereumNetworks.mainnet.rpcUrl] } },
    },
  }) as PublicClient<Transport, Chain>
}

function getExplorerUrl(
  path: string,
  chain?: string,
  network?: string
): string {
  if (chain && chain in skaleChains) {
    return `https://explorer.${chain}.skale.network/${path}`
  }

  if (network === "sepolia") {
    return `https://sepolia.etherscan.io/${path}`
  }

  return `https://etherscan.io/${path}`
}

const ERC20_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], outputs: [{ internalType: "bool", name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" }], outputs: [{ internalType: "uint256", name: "", type: "uint256" }] },
]

const COMMON_EVENTS = [
  { name: "Transfer", type: "event", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { name: "Approval", type: "event", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "spender", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { name: "ApprovalForAll", type: "event", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "operator", type: "address", indexed: true }, { name: "approved", type: "bool", indexed: false }] },
]

async function tryCall(client: PublicClient, address: `0x${string}`, funcName: string, args: unknown[]): Promise<boolean> {
  const funcSelector = getFuncSelector(funcName, args.length)
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    const result = await client.call({
      to: address,
      data: funcSelector,
    }).catch(() => ({ data: "0x" }))
    
    clearTimeout(timeout)
    return result.data !== "0x"
  } catch {
    return false
  }
}

function getFuncSelector(name: string, argCount: number): `0x${string}` {
  const selectors: Record<string, string> = {
    "name0": "0x06fdde03",
    "symbol0": "0x95d89b41",
    "decimals0": "0x313ce567",
    "totalSupply0": "0x18160ddd",
    "balanceOf1": "0x70a08231",
    "transfer2": "0xa9059cbb",
    "approve2": "0x095ea7b3",
    "allowance2": "0xdd62ed3e",
    "tokenURI1": "0xc87b56dd",
    "ownerOf1": "0x6352211e",
    "owner0": "0x8da5cb5b",
    "tokenByIndex1": "0x4f6ccce7",
    "tokenOfOwnerByIndex2": "0x2f745c59",
    "getApproved1": "0x081812fc",
    "isApprovedForAll2": "0xe985e9c5",
    "transferFrom3": "0x23b872dd",
    "mint2": "0x40c10f19",
    "burn1": "0x42966c68",
    "safeTransferFrom3": "0xb88d4fde",
    "setApprovalForAll2": "0xa22cb465",
    "supportsInterface1": "0x01ffc9a7",
  }
  const key = `${name}${argCount}`
  return (selectors[key] || "0x00000000") as `0x${string}`
}

async function detectERC20(client: PublicClient, address: `0x${string}`): Promise<{ detected: boolean; methods: string[] }> {
  const methods: string[] = []
  const testAddress = "0x0000000000000000000000000000000000000001" as `0x${string}`
  
  const erc20Methods = [
    { name: "name", args: [] },
    { name: "symbol", args: [] },
    { name: "decimals", args: [] },
    { name: "totalSupply", args: [] },
    { name: "balanceOf", args: [testAddress] },
    { name: "transfer", args: [testAddress, 1n] },
    { name: "approve", args: [testAddress, 1n] },
    { name: "allowance", args: [testAddress, testAddress] },
  ]
  
  for (const method of erc20Methods) {
    if (await tryCall(client, address, method.name, method.args)) {
      methods.push(method.name)
    }
  }

  const requiredMethods = ["name", "symbol", "decimals", "totalSupply", "balanceOf", "transfer", "approve", "allowance"]
  const hasAllRequired = requiredMethods.every(m => methods.includes(m))

  return {
    detected: hasAllRequired,
    methods,
  }
}

async function detectERC721(client: PublicClient, address: `0x${string}`): Promise<{ detected: boolean; methods: string[] }> {
  const methods: string[] = []
  const testAddress = "0x0000000000000000000000000000000000000001" as `0x${string}`
  
  const erc721Abi = [
    { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ internalType: "string", name: "", type: "string" }] },
    { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ internalType: "string", name: "", type: "string" }] },
    { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], outputs: [{ internalType: "string", name: "", type: "string" }] },
    { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], outputs: [{ internalType: "address", name: "", type: "address" }] },
    { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ internalType: "address", name: "owner", type: "address" }], outputs: [{ internalType: "uint256", name: "", type: "uint256" }] },
  ]
  
  const erc721Methods = [
    { name: "name", args: [] },
    { name: "symbol", args: [] },
    { name: "tokenURI", args: [1n] },
    { name: "ownerOf", args: [1n] },
    { name: "balanceOf", args: [testAddress] },
  ]
  
  for (const method of erc721Methods) {
    if (await tryCall(client, address, method.name, method.args)) {
      methods.push(method.name)
    }
  }

  const requiredMethods = ["name", "symbol", "tokenURI", "ownerOf", "balanceOf"]
  const hasAllRequired = requiredMethods.every(m => methods.includes(m))

  return {
    detected: hasAllRequired,
    methods,
  }
}

async function detectERC165(client: PublicClient, address: `0x${string}`): Promise<boolean> {
  return tryCall(client, address, "supportsInterface", ["0x00000000"])
}

export const contract = Cli
  .create("contract", {
    description: "Contract inspection commands",
  })
  .command("source", {
    description: "Check contract source code information",
    args: z.object({
      address: z.string().describe("Contract address"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "contract source 0x... --chain nebula", description: "Check contract source on Nebula" },
      { command: "contract source 0x... --network mainnet", description: "Check contract source on Ethereum" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      const chainName = chain && chain in skaleChains
        ? skaleChains[chain as SkaleChain].name
        : network && network in ethereumNetworks
          ? ethereumNetworks[network as EthereumNetwork].name
          : ethereumNetworks.mainnet.name

      const client = createClient(chain ?? network ?? undefined)
      const addressHex = getAddress(address) as `0x${string}`

      try {
        const code = await client.getCode({ address: addressHex }) || "0x"
        const hasCode = code !== "0x"
        const codeSizeBytes = hasCode && code.length > 2 ? (code.length - 2) / 2 : 0

        return c.ok({
          address: addressHex,
          isContract: hasCode,
          codeSizeBytes: codeSizeBytes.toString(),
          verificationNote: "Contract verification status cannot be queried via RPC. Use the block explorer to verify source code.",
          explorerUrl: getExplorerUrl(`address/${addressHex}`, chain, network),
          chain: chain || network || "mainnet",
          chainName,
        })
      } catch (error) {
        return c.error({
          code: "SOURCE_QUERY_ERROR",
          message: `Error querying contract source: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
  .command("standards", {
    description: "Check ERC standard compliance",
    args: z.object({
      address: z.string().describe("Contract address"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
    }),
    examples: [
      { command: "contract standards 0x... --chain nebula", description: "Check ERC standards on Nebula" },
      { command: "contract standards 0x... --network mainnet", description: "Check ERC standards on Ethereum" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      const chainName = chain && chain in skaleChains
        ? skaleChains[chain as SkaleChain].name
        : network && network in ethereumNetworks
          ? ethereumNetworks[network as EthereumNetwork].name
          : ethereumNetworks.mainnet.name

      const client = createClient(chain ?? network ?? undefined)
      const addressHex = getAddress(address) as `0x${string}`

      try {
        const code = await client.getCode({ address: addressHex })
        
        if (code === "0x") {
          return c.error({
            code: "NOT_A_CONTRACT",
            message: "Address does not contain contract code",
          })
        }

        const [erc20, erc721, erc165] = await Promise.all([
          detectERC20(client, addressHex),
          detectERC721(client, addressHex),
          detectERC165(client, addressHex),
        ])

        const detectedStandards: string[] = []
        let complianceScore = 0

        if (erc20.detected) {
          detectedStandards.push("ERC20")
          complianceScore += 100
        }
        if (erc721.detected) {
          detectedStandards.push("ERC721")
          complianceScore += 100
        }
        if (erc165) {
          detectedStandards.push("ERC165")
          complianceScore += 50
        }

        return c.ok({
          address: addressHex,
          chain: chain || network || "mainnet",
          chainName,
          detectedStandards,
          erc20: erc20.detected ? { methods: erc20.methods } : null,
          erc721: erc721.detected ? { methods: erc721.methods } : null,
          erc165: erc165,
          complianceScore: detectedStandards.length > 0 ? complianceScore : 0,
          hasCode: true,
        })
      } catch (error) {
        return c.error({
          code: "STANDARDS_CHECK_ERROR",
          message: `Error checking standards: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
  .command("interface", {
    description: "Get contract interface details",
    args: z.object({
      address: z.string().describe("Contract address"),
    }),
    options: z.object({
      chain: skaleChainEnum.optional().describe("SKALE chain name"),
      network: ethereumNetworkEnum.optional().describe("Ethereum network"),
      outputFormat: z.enum(["text", "json", "abi"]).default("text").describe("Output format"),
    }),
    examples: [
      { command: "contract interface 0x... --chain nebula", description: "Get interface on Nebula" },
      { command: "contract interface 0x... --network mainnet --output-format json", description: "Get interface as JSON" },
    ],
    async run(c) {
      const { address } = c.args
      const { chain, network, outputFormat } = c.options

      if (!isAddress(address)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid Ethereum address format",
        })
      }

      if (!chain && !network) {
        return c.error({
          code: "MISSING_TARGET",
          message: "Must specify either --chain or --network",
        })
      }

      const chainName = chain && chain in skaleChains
        ? skaleChains[chain as SkaleChain].name
        : network && network in ethereumNetworks
          ? ethereumNetworks[network as EthereumNetwork].name
          : ethereumNetworks.mainnet.name

      const client = createClient(chain ?? network ?? undefined)
      const addressHex = getAddress(address) as `0x${string}`

      try {
        const code = await client.getCode({ address: addressHex })
        
        if (code === "0x") {
          return c.error({
            code: "NOT_A_CONTRACT",
            message: "Address does not contain contract code",
          })
        }

        const readFunctions: string[] = []
        const writeFunctions: string[] = []
        const events: string[] = []

        const testAddress = "0x0000000000000000000000000000000000000001" as `0x${string}`
        
        const readMethodArgs: Record<string, unknown[]> = {
          name: [],
          symbol: [],
          decimals: [],
          totalSupply: [],
          balanceOf: [testAddress],
          owner: [],
          ownerOf: [1n],
          tokenURI: [1n],
          tokenByIndex: [0n],
          tokenOfOwnerByIndex: [testAddress, 0n],
          getApproved: [1n],
          isApprovedForAll: [testAddress, testAddress],
        }

        const writeMethodArgs: Record<string, unknown[]> = {
          transfer: [testAddress, 1n],
          transferFrom: [testAddress, testAddress, 1n],
          approve: [testAddress, 1n],
          mint: [testAddress, 1n],
          burn: [1n],
          safeTransferFrom: [testAddress, testAddress, 1n],
          setApprovalForAll: [testAddress, true],
        }

        const readMethods = ["name", "symbol", "decimals", "totalSupply", "balanceOf", "owner", "ownerOf", "tokenURI", "tokenByIndex", "tokenOfOwnerByIndex", "getApproved", "isApprovedForAll"]
        const writeMethods = ["transfer", "transferFrom", "approve", "mint", "burn", "safeTransferFrom", "setApprovalForAll"]

        for (const name of readMethods) {
          if (await tryCall(client, addressHex, name, readMethodArgs[name] || [])) {
            readFunctions.push(name)
          }
        }

        for (const name of writeMethods) {
          if (await tryCall(client, addressHex, name, writeMethodArgs[name] || [])) {
            writeFunctions.push(name)
          }
        }

        for (const event of COMMON_EVENTS) {
          events.push(event.name)
        }

        if (outputFormat === "abi") {
          const abiOutput = [
            ...readFunctions.map(name => ({ type: "function", name, stateMutability: "view", inputs: [], outputs: [] })),
            ...writeFunctions.map(name => ({ type: "function", name, stateMutability: "nonpayable", inputs: [], outputs: [] })),
            ...events.map(name => ({ type: "event", name, inputs: [] })),
          ]

          return c.ok({
            address: addressHex,
            chain: chain || network || "mainnet",
            chainName,
            outputFormat: "abi",
            abi: abiOutput,
          })
        }

        return c.ok({
          address: addressHex,
          chain: chain || network || "mainnet",
          chainName,
          outputFormat,
          readFunctionsCount: readFunctions.length,
          writeFunctionsCount: writeFunctions.length,
          eventsCount: events.length,
          readFunctions,
          writeFunctions,
          events,
        })
      } catch (error) {
        return c.error({
          code: "INTERFACE_QUERY_ERROR",
          message: `Error querying interface: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    },
  })
