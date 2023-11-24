import { formatUnits, isAddress, parseUnits, zeroAddress } from 'viem'
import { z } from 'zod'
import type { IFactory as IBlockchainClientFactory } from '@/lib/blockchain/client/IFactory'
import type { Transaction } from '@/lib/blockchain/client/Transaction'
import type { IFactory as IBlockchainSellerMarketplaceClientFactory } from '@/lib/blockchain/seller-marketplace/IFactory'
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

export class BlockchainSellerMarketplaceClientDoesNotExist extends InternalServerError {
  constructor(networkChainId: number) {
    super(
      `Blockchain seller marketplace client for network chain id ${networkChainId} does not exist`
    )
  }
}

export class InvalidSellerMarketplaceSmartContractAddress extends InternalServerError {
  constructor() {
    super('Invalid seller marketplace smart contract address')
  }
}

export class InvalidNetworkMarketplaceTokenSmartContractAddress extends InternalServerError {
  constructor() {
    super('Invalid network marketplace token smart contract address')
  }
}

export class BlockchainProductOrderPaymentMethodMismatch extends InternalServerError {
  constructor(
    blockchainPaymentContract: string,
    databasePaymentContract: string
  ) {
    super(
      `Blockchain payment method mismatch. Expected ${databasePaymentContract}, got ${blockchainPaymentContract}`
    )
  }
}

export class BlockchainProductOrderPriceMismatch extends InternalServerError {
  constructor(blockchainOrderPrice: bigint, databaseOrderPrice: bigint) {
    super(
      `Blockchain price mismatch. Expected ${databaseOrderPrice}, got ${blockchainOrderPrice}`
    )
  }
}

export class UnableToGetProductOrderFromSellerMarketplace extends InternalServerError {
  constructor() {
    super('Unable to get product order from the smart contract')
  }
}

type TxAttributes = {
  hash: string
  id: string
  productOrderId: string
  tokenSmartContractAddress: BlockchainAddress
  productOrderPriceInTokens: bigint
  sellerId: string
  productId: string
  sellerMarketplaceId: string
  sellerMarketplaceTokenId: string
  commissionRate: number
  priceDecimals: number
  tokenSymbol: string
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

export const updateUserProductOrderTransactionsFromBlockchainNetwork = async (
  blockchainClient: IBlockchainClientFactory,
  blockchainSellerMarketplaceClient: IBlockchainSellerMarketplaceClientFactory,
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

  const client = blockchainClient.getClient(
    validationResult.data.networkChainId
  )

  if (!client) {
    throw new BlockchainClientDoesNotExist(validationResult.data.networkChainId)
  }

  const sellerMarketplaceClient = blockchainSellerMarketplaceClient.getClient(
    validationResult.data.networkChainId
  )

  if (!sellerMarketplaceClient) {
    throw new BlockchainSellerMarketplaceClientDoesNotExist(
      validationResult.data.networkChainId
    )
  }

  const unprocessedTransactions = await prisma.productOrderTransaction.findMany(
    {
      where: {
        confirmedAt: null,
        failedAt: null,
        network: {
          chainId: validationResult.data.networkChainId,
        },
        productOrder: {
          confirmedAt: null,
          cancelledAt: null,
          refundedAt: null,
          pendingAt: {
            not: null,
          },
        },
      },
      include: {
        productOrder: {
          include: {
            product: {
              select: {
                sellerId: true,
              },
            },
            sellerMarketplace: {
              include: {
                networkMarketplace: {
                  select: {
                    commissionRate: true,
                  },
                },
              },
            },
            sellerMarketplaceToken: {
              include: {
                networkMarketplaceToken: {
                  select: {
                    smartContractAddress: true,
                    symbol: true,
                  },
                },
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
      // FIXME: Uncovered with tests
      return
    }

    const sellerMarketplaceSmartContractAddress = tx.productOrder
      .sellerMarketplace.smartContractAddress as BlockchainAddress

    if (!isAddress(sellerMarketplaceSmartContractAddress)) {
      // FIXME: Uncovered with tests
      throw new InvalidSellerMarketplaceSmartContractAddress()
    }

    const networkMarketplaceToken =
      tx.productOrder.sellerMarketplaceToken.networkMarketplaceToken

    const tokenSmartContractAddress =
      networkMarketplaceToken.smartContractAddress

    if (
      tokenSmartContractAddress &&
      !isAddress(sellerMarketplaceSmartContractAddress)
    ) {
      // FIXME: Uncovered with tests
      throw new InvalidNetworkMarketplaceTokenSmartContractAddress()
    }

    const productOrderPriceInTokens = parseUnits(
      tx.productOrder.price.toString(),
      tx.productOrder.priceDecimals
    )

    databaseTXs[tx.hash] = {
      id: tx.id,
      productOrderId: tx.productOrderId,
      tokenSmartContractAddress: tokenSmartContractAddress
        ? (tokenSmartContractAddress as BlockchainAddress)
        : (zeroAddress as BlockchainAddress),
      productOrderPriceInTokens: productOrderPriceInTokens,
      sellerId: tx.productOrder.product.sellerId,
      productId: tx.productOrder.productId,
      sellerMarketplaceId: tx.productOrder.sellerMarketplaceId,
      sellerMarketplaceTokenId: tx.productOrder.sellerMarketplaceTokenId,
      commissionRate:
        tx.productOrder.sellerMarketplace.networkMarketplace.commissionRate,
      priceDecimals: tx.productOrder.priceDecimals,
      tokenSymbol:
        tx.productOrder.sellerMarketplaceToken.networkMarketplaceToken.symbol,
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

    const txs = sellerMarketplaceTxHashes[smartContractAddress]

    const blockchainTransactions = await client.getTransactions(
      smartContractAddress as BlockchainAddress,
      txs
    )

    // FIXME: Refactor with this: https://twitter.com/anthony_hagi/status/1712855365036183637
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

      const blockchainProductOrder = await sellerMarketplaceClient.getOrder(
        smartContractAddress,
        tx.productOrderId
      )

      if (!blockchainProductOrder) {
        // FIXME: Uncovered with tests
        throw new UnableToGetProductOrderFromSellerMarketplace()
      }

      if (
        blockchainProductOrder.paymentContract.toLowerCase() !==
        tx.tokenSmartContractAddress.toLowerCase()
      ) {
        // FIXME: Uncovered with tests
        // FIXME: Set order as failed
        // FIXME: Set transaction as failed with a custom error
        throw new BlockchainProductOrderPaymentMethodMismatch(
          blockchainProductOrder.paymentContract.toLowerCase(),
          tx.tokenSmartContractAddress.toLowerCase()
        )
      }

      if (blockchainProductOrder.price !== tx.productOrderPriceInTokens) {
        // FIXME: Uncovered with tests
        throw new BlockchainProductOrderPriceMismatch(
          blockchainProductOrder.price,
          tx.productOrderPriceInTokens
        )
      }

      await confirmTransaction(tx, transaction)
    }
  }
}

const updateFailedTransaction = async (
  transaction: Transaction
): Promise<void> => {
  await prisma.productOrderTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      buyerWalletAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      failedAt: transaction.timestamp,
      blockchainError: transaction.error,
    },
  })
}

const confirmTransaction = async (
  tx: Omit<TxAttributes, 'hash'>,
  transaction: Transaction
): Promise<void> => {
  const platformIncome =
    (tx.productOrderPriceInTokens / 100n) * BigInt(tx.commissionRate)
  const platformIncomeFormatted = formatUnits(platformIncome, tx.priceDecimals)
  const sellerIncome = tx.productOrderPriceInTokens - platformIncome
  const sellerIncomeFormatted = formatUnits(sellerIncome, tx.priceDecimals)

  const setProductOrderAsConfirmed = prisma.productOrder.update({
    where: {
      id: tx.productOrderId,
    },
    data: {
      confirmedAt: transaction.timestamp,
    },
  })

  const updateTransactionData = prisma.productOrderTransaction.update({
    where: {
      hash: transaction.hash,
    },
    data: {
      buyerWalletAddress: transaction.senderAddress,
      gas: transaction.gas,
      transactionFee: transaction.gasValue,
      confirmedAt: transaction.timestamp,
    },
  })

  const addProductSale = prisma.productSale.create({
    data: {
      sellerId: tx.sellerId,
      productId: tx.productId,
      productOrderTransactionId: tx.id,
      sellerMarketplaceId: tx.sellerMarketplaceId,
      sellerMarketplaceTokenId: tx.sellerMarketplaceTokenId,
      sellerIncome: sellerIncomeFormatted,
      sellerIncomeFormatted: sellerIncomeFormatted + ' ' + tx.tokenSymbol,
      platformIncome: platformIncomeFormatted,
      platformIncomeFormatted: platformIncomeFormatted + ' ' + tx.tokenSymbol,
      decimals: tx.priceDecimals,
    },
  })

  await prisma.$transaction([
    setProductOrderAsConfirmed,
    updateTransactionData,
    addProductSale,
  ])
}
