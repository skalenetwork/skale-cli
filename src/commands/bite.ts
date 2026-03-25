import { Cli, z } from "incur"
import { BITE, type Transaction } from "@skalenetwork/bite"
import { skaleChains, skaleChainKeys, type SkaleChain } from "../chains.js"

const skaleChainEnum = z.enum(skaleChainKeys as [string, ...string[]])

const isBiteSupported = (chain: SkaleChain): boolean => {
  return chain === "skale-base" || chain === "skale-base-sepolia" || chain === "skale-bite-sandbox"
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
      { options: { chain: "skale-base", to: "0x1234567890123456789012345678901234567890" }, description: "Encrypt a transaction to an address" },
      { options: { chain: "skale-base", to: "0x1234567890123456789012345678901234567890", data: "0xa9059cbb000000000000000000000000..." }, description: "Encrypt a transaction with data" },
    ],
    async run(c) {
      const { chain, to, data, value } = c.options

      if (!isBiteSupported(chain as SkaleChain)) {
        return c.error({
          code: "BITE_NOT_SUPPORTED",
          message: `BITE is not supported on ${chain}. Only skale-base, skale-base-sepolia, and skale-bite-sandbox support BITE.`,
        })
      }

      try {
        const bite = new BITE(skaleChains[chain as SkaleChain].rpcUrl)

        const tx: Transaction = {
          to,
          data: data ?? "0x",
        }

        const encryptedTx = await bite.encryptTransaction(tx)

        return c.ok({
          originalTransaction: {
            to,
            data: data ?? "0x",
            value: value ?? "0",
          },
          encryptedTransaction: {
            to: encryptedTx.to,
            data: encryptedTx.data,
            gasLimit: encryptedTx.gasLimit,
          },
        })
      } catch (error) {
        return c.error({
          code: "ENCRYPTION_FAILED",
          message: `Failed to encrypt transaction: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    },
  })
  .command("decrypt-tx", {
    description: "Decrypt a transaction (get decrypted data from a tx hash)",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      txhash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).describe("Transaction hash"),
    }),
    examples: [
      { options: { chain: "skale-base", txhash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" }, description: "Decrypt a BITE-encrypted transaction" },
    ],
    async run(c) {
      const { chain, txhash } = c.options

      if (!isBiteSupported(chain as SkaleChain)) {
        return c.error({
          code: "BITE_NOT_SUPPORTED",
          message: `BITE is not supported on ${chain}. Only skale-base, skale-base-sepolia, and skale-bite-sandbox support BITE.`,
        })
      }

      try {
        const bite = new BITE(skaleChains[chain as SkaleChain].rpcUrl)

        const decryptedData = await bite.getDecryptedTransactionData(txhash)

        return c.ok({
          transactionHash: txhash,
          decryptedData,
        })
      } catch (error) {
        return c.error({
          code: "DECRYPTION_FAILED",
          message: `Failed to decrypt transaction: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    },
  })
  .command("encrypt-msg", {
    description: "Encrypt a message using BITE",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      message: z.string().describe("Message to encrypt (will be hex-encoded)"),
    }),
    examples: [
      { options: { chain: "skale-base", message: "Hello World" }, description: "Encrypt a message" },
    ],
    async run(c) {
      const { chain, message } = c.options

      if (!isBiteSupported(chain as SkaleChain)) {
        return c.error({
          code: "BITE_NOT_SUPPORTED",
          message: `BITE is not supported on ${chain}. Only skale-base, skale-base-sepolia, and skale-bite-sandbox support BITE.`,
        })
      }

      try {
        const bite = new BITE(skaleChains[chain as SkaleChain].rpcUrl)

        // Convert message to hex
        const hexMessage = "0x" + Buffer.from(message, "utf-8").toString("hex")

        const encryptedMessage = await bite.encryptMessage(hexMessage)

        return c.ok({
          originalMessage: message,
          hexMessage,
          encryptedMessage,
        })
      } catch (error) {
        return c.error({
          code: "ENCRYPTION_FAILED",
          message: `Failed to encrypt message: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    },
  })
  .command("decrypt-msg", {
    description: "Decrypt a BITE encrypted message",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
      ciphertext: z.string().regex(/^0x[a-fA-F0-9]+$/).describe("Encrypted message (hex)"),
    }),
    examples: [
      { options: { chain: "skale-base", ciphertext: "0x..." }, description: "Decrypt an encrypted message" },
    ],
    async run(c) {
      const { chain } = c.options

      if (!isBiteSupported(chain as SkaleChain)) {
        return c.error({
          code: "BITE_NOT_SUPPORTED",
          message: `BITE is not supported on ${chain}. Only skale-base, skale-base-sepolia, and skale-bite-sandbox support BITE.`,
        })
      }

      return c.error({
        code: "NOT_IMPLEMENTED",
        message: "Direct message decryption is not supported by BITE protocol. Use decrypt-tx with a transaction hash instead.",
      })
    },
  })
  .command("info", {
    description: "Get BITE protocol info for a chain",
    options: z.object({
      chain: skaleChainEnum.describe("SKALE chain name"),
    }),
    examples: [
      { options: { chain: "skale-base" }, description: "Get BITE protocol info for SKALE Base" },
    ],
    async run(c) {
      const { chain } = c.options

      const biteSupported = isBiteSupported(chain as SkaleChain)

      if (!biteSupported) {
        return c.ok({
          biteSupported: false,
          biteEnabled: false,
          committeeInfo: null,
          blsPublicKey: null,
          epochId: null,
        })
      }

      try {
        const bite = new BITE(skaleChains[chain as SkaleChain].rpcUrl)

        const committees = await bite.getCommitteesInfo()

        return c.ok({
          biteSupported: true,
          biteEnabled: committees.length > 0,
          committeeInfo: committees.map(c => ({
            epochId: c.epochId,
            blsPublicKey: c.commonBLSPublicKey,
          })),
          blsPublicKey: committees[0]?.commonBLSPublicKey ?? null,
          epochId: committees[0]?.epochId ?? null,
        })
      } catch (error) {
        return c.ok({
          biteSupported: true,
          biteEnabled: false,
          committeeInfo: null,
          blsPublicKey: null,
          epochId: null,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
  })
