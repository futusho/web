import { isAddress } from 'viem'
import { z } from 'zod'
import type { IFactory as IBlockchainClientFactory } from '@/lib/blockchain/client/IFactory'
import type { Transaction } from '@/lib/blockchain/client/Transaction'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type { BlockchainAddress } from '@/types/blockchain'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from './errors'
import type { TypeOf } from 'zod'

export class NetworkDoesNotExist extends ClientError {
  constructor() {
    super('Network does not exist')
  }
}

export class BlockchainClientDoesNotExist extends InternalServerError {
  constructor(networkChainId: number) {
    super(
      `Blockchain client for network chain id ${networkChainId} does not exist`
    )
  }
}

export class InvalidSellerMarketplaceSmartContractAddress extends InternalServerError {
  constructor() {
    super('Invalid seller marketplace smart contract address')
  }
}

export class BlockchainPayoutOwnerWalletAddressMismatch extends InternalServerError {
  constructor(
    blockchainOwnerWalletAddress: string,
    databasePayoutOwnerWalletAddress: string
  ) {
    super(
      `Blockchain payout owner wallet address mismatch. Expected ${databasePayoutOwnerWalletAddress}, got ${blockchainOwnerWalletAddress}`
    )
  }
}

type TxAttributes = {
  // FIXME: Replace with TransactionHash
  hash: string
  id: string
  sellerPayoutId: string
  ownerWalletAddress: BlockchainAddress
}

type TxMap = {
  [key: string]: Omit<TxAttributes, 'hash'>
}

type SellerMarketplaceTxHashes = {
  [key: string]: string[]
}

export const RequestSchema = z
  .object({
    networkChainId: z.number().positive(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const updateUserPayoutTransactionsFromBlockchainNetwork = async (
  blockchainClient: IBlockchainClientFactory,
  request: Request
): Promise<void> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const network = await prisma.network.findFirst({
    where: {
      chainId: validationResult.data.networkChainId,
    },
  })

  if (!network) {
    throw new NetworkDoesNotExist()
  }

  const client = blockchainClient.getClient(network.chainId)

  if (!client) {
    throw new BlockchainClientDoesNotExist(network.chainId)
  }

  const unprocessedTransactions = await prisma.sellerPayoutTransaction.findMany(
    {
      where: {
        confirmedAt: null,
        failedAt: null,
        network: {
          chainId: network.chainId,
        },
        sellerPayout: {
          confirmedAt: null,
          cancelledAt: null,
          pendingAt: {
            not: null,
          },
        },
      },
      include: {
        sellerPayout: {
          include: {
            sellerMarketplace: {
              select: {
                smartContractAddress: true,
                ownerWalletAddress: true,
              },
            },
          },
        },
      },
    }
  )

  if (unprocessedTransactions.length === 0) {
    return
  }

  const databaseTXs: TxMap = {}
  const sellerMarketplaceTxHashes: SellerMarketplaceTxHashes = {}
  const sellerMarketplacesSmartContractAddress: BlockchainAddress[] = []

  unprocessedTransactions.forEach((tx) => {
    // NOTE: The transaction hash length in Ethereum, specifically in the EVM
    // blockchain network, is 32 bytes or 64 hexadecimal characters.
    // Ethereum uses the Keccak-256 (SHA-3) hash function to generate transaction hashes.
    // 66 - because of leading 0x two symbols.
    if (tx.hash.length !== 66) {
      return
    }

    databaseTXs[tx.hash] = {
      id: tx.id,
      sellerPayoutId: tx.sellerPayoutId,
      ownerWalletAddress: tx.sellerPayout.sellerMarketplace
        .ownerWalletAddress as BlockchainAddress,
    }

    const sellerMarketplaceSmartContractAddress = tx.sellerPayout
      .sellerMarketplace.smartContractAddress as BlockchainAddress

    if (!isAddress(sellerMarketplaceSmartContractAddress)) {
      // FIXME: Uncovered with tests
      throw new InvalidSellerMarketplaceSmartContractAddress()
    }

    if (!sellerMarketplaceTxHashes[sellerMarketplaceSmartContractAddress]) {
      sellerMarketplacesSmartContractAddress.push(
        sellerMarketplaceSmartContractAddress
      )
      sellerMarketplaceTxHashes[sellerMarketplaceSmartContractAddress] = []
    }

    sellerMarketplaceTxHashes[sellerMarketplaceSmartContractAddress].push(
      tx.hash as BlockchainAddress
    )
  })

  for (let i = 0; i < sellerMarketplacesSmartContractAddress.length; i++) {
    const smartContractAddress = sellerMarketplacesSmartContractAddress[i]

    const blockchainTransactions = await client.getTransactions(
      smartContractAddress,
      sellerMarketplaceTxHashes[smartContractAddress]
    )

    // FIXME: Refactor with https://twitter.com/anthony_hagi/status/1712855365036183637
    for (let idx = 0; idx < blockchainTransactions.length; idx++) {
      const transaction = blockchainTransactions[idx]

      // We will not process blockchain transactions which aren't exist in our database
      // NOTE: It looks like this situation is almost impossible,
      // because we request only database transactions
      if (!databaseTXs[transaction.hash]) {
        continue
      }

      if (!transaction.success) {
        await updateFailedTransaction(transaction)

        continue
      }

      const tx = databaseTXs[transaction.hash]

      // FIXME: Uncovered with tests
      if (
        tx.ownerWalletAddress.toLowerCase() !==
        transaction.senderAddress.toLowerCase()
      ) {
        throw new BlockchainPayoutOwnerWalletAddressMismatch(
          transaction.senderAddress.toLowerCase(),
          tx.ownerWalletAddress.toLowerCase()
        )
      }

      await setUserPayoutAndTransactionConfirmed(tx, transaction)
    }
  }
}

const updateFailedTransaction = async (
  transaction: Transaction
): Promise<void> => {
  await prisma.sellerPayoutTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      ownerWalletAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      failedAt: transaction.timestamp,
      blockchainError: transaction.error,
    },
  })
}

const setUserPayoutAndTransactionConfirmed = async (
  tx: Omit<TxAttributes, 'hash'>,
  transaction: Transaction
): Promise<void> => {
  const setPayoutAsConfirmed = prisma.sellerPayout.update({
    where: {
      id: tx.sellerPayoutId,
    },
    data: {
      confirmedAt: transaction.timestamp,
    },
  })

  const updateTransactionData = prisma.sellerPayoutTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      ownerWalletAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      confirmedAt: transaction.timestamp,
    },
  })

  await prisma.$transaction([setPayoutAsConfirmed, updateTransactionData])
}
