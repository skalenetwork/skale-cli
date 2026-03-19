import { Cli, z } from "incur"
import {
  encodeFunctionData,
  encodePacked,
  encodeAbiParameters,
  createPublicClient,
  http,
  parseEther,
  parseGwei,
  toHex,
  getAddress,
  isAddress,
  keccak256,
  toBytes,
  serializeTransaction,
  type Chain,
  type Transport,
  type PublicClient,
  type TransactionRequest,
  type Abi,
} from "viem"
import { skaleChains, ethereumNetworks, type SkaleChain, type EthereumNetwork } from "../chains.js"

function parseMethodSignature(method: string): { name: string; inputs: { type: string; name: string }[] } {
  const match = method.match(/^(\w+)\((.*)\)$/)
  if (!match) {
    throw new Error("Invalid method signature format. Use: functionName(type1,type2,...)")
  }

  const name = match[1]
  const typesStr = match[2]

  if (!typesStr.trim()) {
    return { name, inputs: [] }
  }

  const types = typesStr.split(",").map((t) => t.trim())
  const inputs = types.map((type, index) => ({
    type,
    name: `param${index}`,
  }))

  return { name, inputs }
}

function getSelector(method: string): string {
  const hash = keccak256(toBytes(method))
  return "0x" + hash.slice(2, 10)
}

function parseParams(paramsStr: string, types: string[]): unknown[] {
  const params = paramsStr.split(",").map((p) => p.trim())

  if (params.length !== types.length) {
    throw new Error(`Parameter count mismatch. Expected ${types.length}, got ${params.length}`)
  }

  return types.map((type, i) => {
    const value = params[i]

    if (type === "address") {
      return getAddress(value)
    }

    if (type.startsWith("uint") || type.startsWith("int")) {
      return BigInt(value)
    }

    if (type === "bool") {
      return value === "true" || value === "1"
    }

    if (type.startsWith("bytes")) {
      return value
    }

    if (type === "string") {
      return value
    }

    return value
  })
}

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

export const txprep = Cli
  .create("txprep", {
    description: "Transaction preparation commands",
  })
  .command("encode", {
    description: "Generate calldata for contract method calls",
    args: z.object({
      method: z.string().describe("Method signature like 'transfer(address,uint256)'"),
      params: z.string().describe("Comma-separated parameters"),
    }),
    options: z.object({
      abi: z.string().optional().describe("Path to ABI file or contract name"),
    }),
    examples: [
      { command: "txprep encode 'transfer(address,uint256)' '0x...,100'", description: "Encode transfer calldata" },
    ],
    run(c) {
      const { method, params } = c.args

      const parsed = parseMethodSignature(method)
      const types = parsed.inputs.map((i) => i.type)
      const values = parseParams(params, types)

      const selector = getSelector(method)

      const abi: Abi = [{
        name: parsed.name,
        type: "function",
        inputs: parsed.inputs,
        outputs: [],
        stateMutability: "nonpayable",
      }]

      const calldata = encodeFunctionData({
        abi,
        functionName: parsed.name,
        args: values as never[],
      })

      return c.ok({
        method,
        parameters: values.map((v) => (typeof v === "bigint" ? v.toString() : v)),
        types,
        selector,
        calldata,
      })
    },
  })
  .command("selector", {
    description: "Get function selector for a method signature",
    args: z.object({
      method: z.string().describe("Method signature"),
    }),
    examples: [
      { command: "txprep selector 'transfer(address,uint256)'", description: "Get function selector" },
    ],
    run(c) {
      const { method } = c.args

      const fullHash = keccak256(toBytes(method))
      const selector = "0x" + fullHash.slice(2, 10)

      return c.ok({
        method,
        selector,
        fullKeccak256: fullHash,
      })
    },
  })
  .command("encode-param", {
    description: "Encode parameters for smart contract calls",
    args: z.object({
      type: z.string().describe("Solidity type (address, uint256, bytes32, string, bool, etc.)"),
      value: z.string().describe("Value to encode"),
    }),
    options: z.object({
      array: z.boolean().default(false).describe("Treat value as array (comma-separated)"),
      dynamic: z.boolean().default(false).describe("Mark as dynamic type"),
    }),
    examples: [
      { command: "txprep encode-param address 0x...", description: "Encode an address" },
      { command: "txprep encode-param uint256 1000", description: "Encode a uint256" },
      { command: "txprep encode-param string 'hello world'", description: "Encode a string" },
    ],
    run(c) {
      const { type, value } = c.args
      const { array, dynamic } = c.options

      let encoded: string

      if (array) {
        const values = value.split(",").map((v) => v.trim())
        encoded = encodeAbiParameters(
          [{ type: `${type}[${values.length}]` } as never],
          [values.map((v) => {
            if (type === "address") return getAddress(v)
            if (type.startsWith("uint") || type.startsWith("int")) return BigInt(v)
            if (type === "bool") return v === "true" || v === "1"
            return v
          })]
        )
      } else {
        let parsedValue: unknown = value

        if (type === "address") {
          parsedValue = getAddress(value)
        } else if (type.startsWith("uint") || type.startsWith("int")) {
          parsedValue = BigInt(value)
        } else if (type === "bool") {
          parsedValue = value === "true" || value === "1"
        }

        if (dynamic) {
          encoded = encodePacked([type as never], [parsedValue] as never)
        } else {
          encoded = encodeAbiParameters([{ type, name: "value" }], [parsedValue])
        }
      }

      return c.ok({
        type: array ? `${type}[]` : type,
        value: array ? value.split(",").map((v) => v.trim()) : value,
        dynamic,
        encoded,
      })
    },
  })
  .command("build-tx", {
    description: "Build unsigned transaction object",
    args: z.object({
      to: z.string().describe("Recipient address"),
      value: z.string().describe("Amount"),
    }),
    options: z.object({
      chain: z.enum(["calypso", "europa", "nebula", "titan", "strayshot", "skale-base", "calypso-testnet", "europa-testnet", "nebula-testnet", "titan-testnet", "skale-base-sepolia"]).optional().describe("SKALE chain"),
      network: z.enum(["mainnet", "sepolia"]).optional().describe("Ethereum network"),
      data: z.string().optional().describe("Hex string data"),
      "gas-limit": z.number().optional().describe("Gas limit"),
      nonce: z.number().optional().describe("Nonce"),
      eth: z.boolean().default(false).describe("Treat value as ETH instead of wei"),
      "max-fee": z.string().optional().describe("Max fee in wei"),
      "max-priority-fee": z.string().optional().describe("Max priority fee in wei"),
    }),
    examples: [
      { command: "txprep build-tx 0x... 100 --eth", description: "Build TX with 100 ETH" },
      { command: "txprep build-tx 0x... 1000000000000000000 --chain calypso", description: "Build TX on SKALE chain" },
    ],
    async run(c) {
      const { to, value } = c.args
      const { chain, network, data, "gas-limit": gasLimit, nonce: providedNonce, eth, "max-fee": maxFee, "max-priority-fee": maxPriorityFee } = c.options

      if (!isAddress(to)) {
        return c.error({
          code: "INVALID_ADDRESS",
          message: "Invalid recipient address",
        })
      }

      const chainConfig = getChainConfig(chain ?? network ?? undefined)
      let client: PublicClient<Transport, Chain>

      if (chainConfig) {
        const rpcUrl = chainConfig.config.rpcUrl
        client = createPublicClient({
          transport: http(rpcUrl),
          chain: {
            id: 0,
            name: chainConfig.config.name,
            nativeCurrency: { name: "SKL", symbol: "SKL", decimals: 18 },
            rpcUrls: { default: { http: [rpcUrl] } },
          },
        }) as PublicClient<Transport, Chain>
      } else {
        client = createPublicClient({
          transport: http(ethereumNetworks.mainnet.rpcUrl),
          chain: {
            id: 1,
            name: "Ethereum Mainnet",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: { default: { http: [ethereumNetworks.mainnet.rpcUrl] } },
          },
        }) as PublicClient<Transport, Chain>
      }

      const [chainId, gasPrice] = await Promise.all([
        client.getChainId(),
        client.getGasPrice(),
      ])

      const valueWei = eth ? parseEther(value) : BigInt(value)

      const tx: TransactionRequest = {
        to,
        value: valueWei,
        data: data || "0x",
        chainId,
      }

      if (gasLimit) {
        tx.gas = BigInt(gasLimit)
      }

      if (providedNonce !== undefined) {
        tx.nonce = providedNonce
      }

      if (maxFee) {
        tx.maxFeePerGas = BigInt(maxFee)
      } else {
        tx.maxFeePerGas = gasPrice * 2n
      }

      if (maxPriorityFee) {
        tx.maxPriorityFeePerGas = BigInt(maxPriorityFee)
      } else {
        tx.maxPriorityFeePerGas = tx.maxFeePerGas / 10n
      }

      const serialized = serializeTransaction({
        to,
        value: valueWei,
        data: data || "0x",
        chainId,
        gas: tx.gas,
        nonce: tx.nonce,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      })

      return c.ok({
        transaction: {
          to,
          value: valueWei.toString(),
          data: data || "0x",
          chainId,
          gas: tx.gas?.toString(),
          nonce: tx.nonce,
          maxFeePerGas: tx.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
        },
        serialized,
        raw: serialized,
      })
    },
  })
