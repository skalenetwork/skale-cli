import { Cli, z } from "incur"
import { createPublicClient, http, type PublicClient } from "viem"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])

const skaleProvider = (chain: SkaleChain): PublicClient => {
  const chainConfig = skaleChains[chain]
  return createPublicClient({ transport: http(chainConfig.rpcUrl) })
}

export const bite = Cli
  .create("bite", {
    description: "BITE (Blockchain Integrated Threshold Encryption) commands",
  })
  .command("encrypt-tx", {
    description: "Encrypt a transaction using BITE",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      to: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Recipient address"),
      data: z.string().regex(/^0x[a-fA-F0-9]*$/).optional().describe("Transaction data as hex string"),
      value: z.string().optional().describe("ETH value in wei"),
    }),
    examples: [
      { command: "bite encrypt-tx --chain europa --to 0x1234567890123456789012345678901234567890", description: "Encrypt a transaction to an address" },
      { command: "bite encrypt-tx --chain europa --to 0x1234567890123456789012345678901234567890 --data 0x", description: "Encrypt a transaction with data" },
    ],
    async run(c) {
      const { chain, to, data, value } = c.options

      return c.ok({
        message: "Feature coming soon",
        feature: "encrypt-tx",
        description: "This will encrypt a transaction using BITE threshold encryption",
        parameters: {
          chain,
          to,
          data,
          value,
        },
      })
    },
  })
  .command("decrypt-tx", {
    description: "Decrypt a transaction (get decrypted data from a tx hash)",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      txhash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).describe("Transaction hash"),
    }),
    examples: [
      { command: "bite decrypt-tx --chain europa --txhash 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", description: "Decrypt a transaction" },
    ],
    async run(c) {
      const { chain, txhash } = c.options

      const client = skaleProvider(chain as SkaleChain)
      const tx = await client.getTransaction({ hash: txhash })

      if (!tx) {
        return c.error({
          code: "TX_NOT_FOUND",
          message: `Transaction ${txhash} not found on ${chain}`,
        })
      }

      return c.ok({
        message: "Feature coming soon",
        feature: "decrypt-tx",
        description: "This will decrypt transaction data using BITE",
        parameters: {
          chain,
          txhash,
        },
        transactionDetails: {
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          data: tx.input,
          chainId: chain,
        },
      })
    },
  })
  .command("encrypt-msg", {
    description: "Encrypt a message using BITE",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      message: z.string().describe("Message to encrypt"),
    }),
    examples: [
      { command: "bite encrypt-msg --chain europa --message \"Hello World\"", description: "Encrypt a message" },
    ],
    async run(c) {
      const { chain, message } = c.options

      return c.ok({
        message: "Feature coming soon",
        feature: "encrypt-msg",
        description: "This will encrypt a message using BITE threshold encryption",
        parameters: {
          chain,
          message,
        },
      })
    },
  })
  .command("decrypt-msg", {
    description: "Decrypt a BITE encrypted message",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      ciphertext: z.string().regex(/^0x[a-fA-F0-9]+$/).describe("Encrypted message"),
    }),
    examples: [
      { command: "bite decrypt-msg --chain europa --ciphertext 0x...", description: "Decrypt an encrypted message" },
    ],
    async run(c) {
      const { chain, ciphertext } = c.options

      return c.ok({
        message: "Feature coming soon",
        feature: "decrypt-msg",
        description: "This will decrypt a BITE encrypted message",
        parameters: {
          chain,
          ciphertext,
        },
      })
    },
  })
  .command("info", {
    description: "Get BITE protocol info for a chain",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { command: "bite info --chain europa", description: "Get BITE protocol info for Europa" },
    ],
    async run(c) {
      const { chain } = c.options

      const chainConfig = skaleChains[chain as SkaleChain]

      return c.ok({
        chain,
        chainName: chainConfig.name,
        biteEnabled: false,
        committeeInfo: null,
        blsPublicKey: null,
        epochId: null,
        message: "Feature coming soon",
        description: "This will return BITE protocol info including whether it's enabled, committee info, BLS public key, and epoch ID",
      })
    },
  })
