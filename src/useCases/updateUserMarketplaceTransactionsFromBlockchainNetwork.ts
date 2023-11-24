import { isAddress } from 'viem'
import { z } from 'zod'
import type { IFactory as IBlockchainClientFactory } from '@/lib/blockchain/client/IFactory'
import type { Transaction } from '@/lib/blockchain/client/Transaction'
import type { IFactory as IBlockchainMarketplaceClientFactory } from '@/lib/blockchain/marketplace/IFactory'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type { BlockchainAddress } from '@/types/blockchain'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from './errors'
import type { TypeOf } from 'zod'

export class NetworkMarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('Network marketplace does not exist')
  }
}

export class InvalidNetworkMarketplaceSmartContractAddress extends InternalServerError {
  constructor() {
    super('Invalid network marketplace smart contract address')
  }
}

export class BlockchainClientDoesNotExist extends InternalServerError {
  constructor(networkChainId: number) {
    super(
      `Blockchain client for network chain id ${networkChainId} does not exist`
    )
  }
}

export class BlockchainMarketplaceClientDoesNotExist extends InternalServerError {
  constructor(networkChainId: number) {
    super(
      `Blockchain marketplace client for network chain id ${networkChainId} does not exist`
    )
  }
}

export class UnableToGetSellerMarketplaceFromBlockchainMarketplace extends InternalServerError {
  constructor() {
    super('Unable to get seller marketplace from blockchain marketplace')
  }
}

export class SellerMarketplaceSmartContractAddressIsNotUnique extends InternalServerError {
  constructor(smartContractAddress: BlockchainAddress) {
    super(
      `Seller marketplace smart contract address is not unique: ${smartContractAddress}`
    )
  }
}

type TxAttributes = {
  hash: string
  id: string
  sellerId: string
  sellerMarketplaceId: string
}

type TxMap = {
  [key: string]: Omit<TxAttributes, 'hash'>
}

export const RequestSchema = z
  .object({
    networkMarketplaceId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const updateUserMarketplaceTransactionsFromBlockchainNetwork = async (
  blockchainClient: IBlockchainClientFactory,
  blockchainMarketplaceClient: IBlockchainMarketplaceClientFactory,
  request: Request
): Promise<void> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const networkMarketplace = await prisma.networkMarketplace.findUnique({
    where: {
      id: validationResult.data.networkMarketplaceId,
    },
    include: {
      network: {
        select: {
          chainId: true,
        },
      },
    },
  })

  if (!networkMarketplace) {
    throw new NetworkMarketplaceDoesNotExist()
  }

  if (!isAddress(networkMarketplace.smartContractAddress)) {
    throw new InvalidNetworkMarketplaceSmartContractAddress()
  }

  const networkChainId = networkMarketplace.network.chainId

  const client = blockchainClient.getClient(networkChainId)

  if (!client) {
    throw new BlockchainClientDoesNotExist(networkChainId)
  }

  const marketplaceClient =
    blockchainMarketplaceClient.getClient(networkChainId)

  if (!marketplaceClient) {
    throw new BlockchainMarketplaceClientDoesNotExist(networkChainId)
  }

  const unprocessedTransactions =
    await prisma.sellerMarketplaceTransaction.findMany({
      select: {
        id: true,
        sellerId: true,
        sellerMarketplaceId: true,
        hash: true,
      },
      where: {
        confirmedAt: null,
        failedAt: null,
        network: {
          chainId: networkChainId,
        },
        sellerMarketplace: {
          confirmedAt: null,
          networkMarketplace: {
            id: validationResult.data.networkMarketplaceId,
          },
        },
      },
    })

  if (unprocessedTransactions.length === 0) {
    return
  }

  const databaseTXs: TxMap = {}
  const transactionHashes: string[] = []

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
      sellerId: tx.sellerId,
      sellerMarketplaceId: tx.sellerMarketplaceId,
    }

    transactionHashes.push(tx.hash)
  })

  if (transactionHashes.length === 0) {
    return
  }

  const blockchainTransactions = await client.getTransactions(
    networkMarketplace.smartContractAddress as BlockchainAddress,
    transactionHashes
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

    // FIXME: Refactor with getSellerMarketplaces() to decrease number of calls
    const sellerMarketplaceAddress =
      await marketplaceClient.getSellerMarketplaceAddress(
        networkMarketplace.smartContractAddress as BlockchainAddress,
        tx.sellerId,
        tx.sellerMarketplaceId
      )

    if (!sellerMarketplaceAddress) {
      // FIXME: Store this error into a database
      throw new UnableToGetSellerMarketplaceFromBlockchainMarketplace()
    }

    const sellerMarketplaceSmartContractAddressExists =
      await prisma.sellerMarketplace.findFirst({
        where: {
          smartContractAddress: sellerMarketplaceAddress,
        },
      })

    // FIXME: Uncovered with tests
    if (sellerMarketplaceSmartContractAddressExists) {
      throw new SellerMarketplaceSmartContractAddressIsNotUnique(
        sellerMarketplaceAddress
      )
    }

    await setMarketplaceAndTransactionConfirmed(
      sellerMarketplaceAddress,
      tx,
      transaction
    )
  }
}

const updateFailedTransaction = async (
  transaction: Transaction
): Promise<void> => {
  await prisma.sellerMarketplaceTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      senderAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      failedAt: transaction.timestamp,
      blockchainError: transaction.error,
    },
  })
}

const setMarketplaceAndTransactionConfirmed = async (
  sellerMarketplaceAddress: BlockchainAddress,
  tx: Omit<TxAttributes, 'hash'>,
  transaction: Transaction
): Promise<void> => {
  const setMarketplaceAsConfirmed = prisma.sellerMarketplace.update({
    where: {
      id: tx.sellerMarketplaceId,
    },
    data: {
      confirmedAt: transaction.timestamp,
      ownerWalletAddress: transaction.senderAddress,
      smartContractAddress: sellerMarketplaceAddress,
    },
  })

  const updateTransactionData = prisma.sellerMarketplaceTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      senderAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      confirmedAt: transaction.timestamp,
    },
  })

  await prisma.$transaction([setMarketplaceAsConfirmed, updateTransactionData])
}
