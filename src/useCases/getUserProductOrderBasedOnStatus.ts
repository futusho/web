import { isAddress, parseUnits } from 'viem'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type {
  BlockchainAddress,
  BlockchainTransactionHash,
} from '@/types/blockchain'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class OrderDoesNotExist extends ClientError {
  constructor() {
    super('Order does not exist')
  }
}

export class DraftOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Draft order does not exist')
  }
}

export class PendingOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Pending order does not exist')
  }
}

export class UnconfirmedOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Unconfirmed order does not exist')
  }
}

export class ConfirmedOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Confirmed order does not exist')
  }
}

export class CancelledOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Cancelled order does not exist')
  }
}

export class RefundedOrderDoesNotExist extends InternalServerError {
  constructor() {
    super('Refunded order does not exist')
  }
}

export class SellerMarketplaceDoesNotHaveValidOwnerWalletAddress extends InternalServerError {
  constructor() {
    super('Seller marketplace does not have valid owner wallet address')
  }
}

export class SellerMarketplaceDoesNotHaveValidSmartContractAddress extends InternalServerError {
  constructor() {
    super('Seller marketplace does not have valid smart contract address')
  }
}

export class NetworkMarketplaceTokenDoesNotHaveValidSmartContractAddress extends InternalServerError {
  constructor() {
    super(
      'Network marketplace token does not have valid smart contract address'
    )
  }
}

export class RefundedOrderDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Refunded order does not have confirmed transaction')
  }
}

export class CancelledOrderMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Cancelled order must not have confirmed transactions')
  }
}

export class CancelledOrderMustNotHavePendingTransactions extends InternalServerError {
  constructor() {
    super('Cancelled order must not have pending transactions')
  }
}

export class ConfirmedOrderDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed order does not have confirmed transaction')
  }
}

export class PendingOrderMustHaveTransactions extends InternalServerError {
  constructor() {
    super('Pending order must have transactions')
  }
}

export class PendingOrderMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Pending order must not have confirmed transactions')
  }
}

export class DraftOrderMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft order must not have transactions')
  }
}

export class ProductDoesNotHaveContent extends InternalServerError {
  constructor() {
    super('Product does not have content')
  }
}

export class ConfirmedOrderTransactionDoesNotHaveGas extends InternalServerError {
  constructor() {
    super('Confirmed order transaction does not have gas')
  }
}

export class ConfirmedOrderTransactionDoesNotHaveTransactionFee extends InternalServerError {
  constructor() {
    super('Confirmed order transaction does not have transaction fee')
  }
}

type OrderStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_confirmation'
  | 'refunded'
  | 'cancelled'
  | 'confirmed'

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userProductOrderId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

interface FailedOrderTransaction {
  transactionHash: BlockchainTransactionHash
  date: string
}

type UnpaidOrder = {
  id: string
  productTitle: string
  priceFormatted: string
  networkChainId: number
  networkTitle: string
  networkBlockchainExplorerURL: string
  sellerMarketplaceSmartContractAddress: BlockchainAddress
  sellerWalletAddress: BlockchainAddress
  sellerDisplayName: string
  sellerUsername: string
}

type DraftOrder = UnpaidOrder

export type DraftOrderCoin = DraftOrder & {
  priceInCoins: string
}

export type DraftOrderERC20 = DraftOrder & {
  tokenSmartContractAddress: BlockchainAddress
  priceInTokens: string
}

type PendingOrder = UnpaidOrder & {
  failedTransactions: FailedOrderTransaction[]
}

export type PendingOrderCoin = PendingOrder & {
  priceInCoins: string
}

export type PendingOrderERC20 = PendingOrder & {
  tokenSmartContractAddress: BlockchainAddress
  priceInTokens: string
}

export type UnconfirmedOrder = {
  id: string
  productTitle: string
  transactionId: string
  transactionHash: BlockchainTransactionHash
  networkBlockchainExplorerURL: string
}

// FIXME: Do I need all of these fields?
export type ConfirmedOrder = {
  productTitle: string
  confirmedAt: string
  productContent: string
  productThumbnailImageURL: string | null
  sellerWalletAddress: BlockchainAddress
  buyerWalletAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  gas: number
  transactionFee: string
}

export type RefundedOrder = {
  productTitle: string
  refundedAt: string
}

export type CancelledOrder = {
  productTitle: string
  cancelledAt: string
}

export type UserProductOrder =
  | DraftOrderCoin
  | DraftOrderERC20
  | PendingOrderCoin
  | PendingOrderERC20
  | UnconfirmedOrder
  | ConfirmedOrder
  | CancelledOrder
  | RefundedOrder

export const getUserProductOrderBasedOnStatus = async (
  request: Request
): Promise<UserProductOrder> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  if (!(await isUserExists(validationResult.data.userId))) {
    throw new UserDoesNotExist()
  }

  const productOrderStatus = await getProductOrderStatus(
    validationResult.data.userId,
    validationResult.data.userProductOrderId
  )

  switch (productOrderStatus) {
    case 'draft': {
      return await getDraftOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    case 'pending': {
      return await getPendingOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    case 'awaiting_confirmation': {
      return await getUnconfirmedOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    case 'confirmed': {
      return await getConfirmedOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    case 'cancelled': {
      return await getCancelledOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    case 'refunded': {
      return await getRefundedOrder(
        validationResult.data.userId,
        validationResult.data.userProductOrderId
      )
    }

    default: {
      throw new Error(`Unknown product order status ${productOrderStatus}`)
    }
  }
}

const getDraftOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<DraftOrderCoin | DraftOrderERC20> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      cancelledAt: null,
      confirmedAt: null,
      refundedAt: null,
    },
    include: {
      product: {
        include: {
          seller: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
      sellerMarketplace: {
        include: {
          network: {
            select: {
              title: true,
              chainId: true,
              blockchainExplorerURL: true,
            },
          },
        },
      },
      sellerMarketplaceToken: {
        include: {
          networkMarketplaceToken: {
            select: {
              smartContractAddress: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    throw new DraftOrderDoesNotExist()
  }

  const sellerMarketplace = order.sellerMarketplace

  if (!isAddress(sellerMarketplace.ownerWalletAddress)) {
    throw new SellerMarketplaceDoesNotHaveValidOwnerWalletAddress()
  }

  if (!isAddress(sellerMarketplace.smartContractAddress)) {
    throw new SellerMarketplaceDoesNotHaveValidSmartContractAddress()
  }

  const network = sellerMarketplace.network
  const networkMarketplaceToken =
    order.sellerMarketplaceToken.networkMarketplaceToken

  const draftOrder: DraftOrder = {
    id: order.id,
    productTitle: order.product.title,
    priceFormatted: order.priceFormatted,
    networkChainId: network.chainId,
    networkTitle: network.title,
    sellerMarketplaceSmartContractAddress:
      sellerMarketplace.smartContractAddress as BlockchainAddress,
    networkBlockchainExplorerURL: network.blockchainExplorerURL,
    sellerWalletAddress:
      sellerMarketplace.ownerWalletAddress as BlockchainAddress,
    sellerUsername: order.product.seller.username,
    sellerDisplayName:
      order.product.seller.name ?? order.product.seller.username,
  }

  if (networkMarketplaceToken.smartContractAddress) {
    // ERC20 token

    if (!isAddress(networkMarketplaceToken.smartContractAddress)) {
      throw new NetworkMarketplaceTokenDoesNotHaveValidSmartContractAddress()
    }

    return {
      ...draftOrder,
      tokenSmartContractAddress:
        networkMarketplaceToken.smartContractAddress as BlockchainAddress,
      priceInTokens: parseUnits(
        order.price.toString(),
        order.priceDecimals
      ).toString(),
    } as DraftOrderERC20
  }

  // Native coin
  return {
    ...draftOrder,
    priceInCoins: parseUnits(
      order.price.toString(),
      order.priceDecimals
    ).toString(),
  } as DraftOrderCoin
}

const getPendingOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<PendingOrderCoin | PendingOrderERC20> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      cancelledAt: null,
      confirmedAt: null,
      refundedAt: null,
    },
    include: {
      product: {
        include: {
          seller: {
            select: {
              name: true,
              username: true,
            },
          },
        },
      },
      sellerMarketplace: {
        include: {
          network: {
            select: {
              title: true,
              chainId: true,
              blockchainExplorerURL: true,
            },
          },
        },
      },
      sellerMarketplaceToken: {
        include: {
          networkMarketplaceToken: {
            select: {
              smartContractAddress: true,
            },
          },
        },
      },
      transactions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!order) {
    throw new PendingOrderDoesNotExist()
  }

  const sellerMarketplace = order.sellerMarketplace

  if (!isAddress(sellerMarketplace.ownerWalletAddress)) {
    // FIXME: Uncovered with tests
    throw new SellerMarketplaceDoesNotHaveValidOwnerWalletAddress()
  }

  if (!isAddress(sellerMarketplace.smartContractAddress)) {
    // FIXME: Uncovered with tests
    throw new SellerMarketplaceDoesNotHaveValidSmartContractAddress()
  }

  const network = sellerMarketplace.network
  const networkMarketplaceToken =
    order.sellerMarketplaceToken.networkMarketplaceToken

  const pendingOrder: PendingOrder = {
    id: order.id,
    productTitle: order.product.title,
    priceFormatted: order.priceFormatted,
    networkChainId: network.chainId,
    networkTitle: network.title,
    sellerMarketplaceSmartContractAddress:
      sellerMarketplace.smartContractAddress as BlockchainAddress,
    networkBlockchainExplorerURL: network.blockchainExplorerURL,
    sellerWalletAddress:
      sellerMarketplace.ownerWalletAddress as BlockchainAddress,
    sellerUsername: order.product.seller.username,
    sellerDisplayName:
      order.product.seller.name ?? order.product.seller.username,
    failedTransactions: order.transactions.map((transaction) => ({
      transactionHash: transaction.hash as BlockchainTransactionHash,
      date: transaction.failedAt ? transaction.failedAt.toISOString() : '',
    })),
  }

  if (networkMarketplaceToken.smartContractAddress) {
    // ERC20 token

    if (!isAddress(networkMarketplaceToken.smartContractAddress)) {
      // FIXME: Uncovered with tests
      throw new NetworkMarketplaceTokenDoesNotHaveValidSmartContractAddress()
    }

    return {
      ...pendingOrder,
      tokenSmartContractAddress:
        networkMarketplaceToken.smartContractAddress as BlockchainAddress,
      priceInTokens: parseUnits(
        order.price.toString(),
        order.priceDecimals
      ).toString(),
    } as PendingOrderERC20
  }

  // Native coin
  return {
    ...pendingOrder,
    priceInCoins: parseUnits(
      order.price.toString(),
      order.priceDecimals
    ).toString(),
  } as PendingOrderCoin
}

const getUnconfirmedOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<UnconfirmedOrder> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      pendingAt: {
        not: null,
      },
      cancelledAt: null,
      confirmedAt: null,
      refundedAt: null,
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
      sellerMarketplace: {
        include: {
          network: {
            select: {
              blockchainExplorerURL: true,
            },
          },
        },
      },
      transactions: {
        select: {
          id: true,
          hash: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  })

  if (!order) {
    throw new UnconfirmedOrderDoesNotExist()
  }

  const recentTransaction = order.transactions[0]

  return {
    id: order.id,
    transactionId: recentTransaction.id,
    productTitle: order.product.title,
    networkBlockchainExplorerURL:
      order.sellerMarketplace.network.blockchainExplorerURL,
    transactionHash: recentTransaction.hash as BlockchainTransactionHash,
  }
}

const getConfirmedOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<ConfirmedOrder> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      cancelledAt: null,
      confirmedAt: {
        not: null,
      },
      refundedAt: null,
    },
    include: {
      product: {
        include: {
          productImages: {
            select: {
              url: true,
            },
            where: {
              type: 'thumbnail',
            },
            orderBy: {
              createdAt: 'asc',
            },
            take: 1,
          },
        },
      },
      sellerMarketplace: {
        include: {
          network: {
            select: {
              blockchainExplorerURL: true,
            },
          },
        },
      },
      transactions: {
        select: {
          confirmedAt: true,
          buyerWalletAddress: true,
          gas: true,
          transactionFee: true,
        },
        where: {
          confirmedAt: {
            not: null,
          },
          failedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  })

  if (!order) {
    throw new ConfirmedOrderDoesNotExist()
  }

  if (!order.product.content) {
    // FIXME: Uncovered with tests
    throw new ProductDoesNotHaveContent()
  }

  const recentTransaction = order.transactions[0]

  if (!recentTransaction.gas) {
    // FIXME: Uncovered with tests
    throw new ConfirmedOrderTransactionDoesNotHaveGas()
  }

  if (!recentTransaction.transactionFee) {
    // FIXME: Uncovered with tests
    throw new ConfirmedOrderTransactionDoesNotHaveTransactionFee()
  }

  const productThumbnailImageURL =
    order.product.productImages.length > 0
      ? order.product.productImages[0].url
      : null

  return {
    productTitle: order.product.title,
    confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : '',
    productContent: order.product.content,
    sellerWalletAddress: order.sellerWalletAddress as BlockchainAddress,
    buyerWalletAddress:
      recentTransaction.buyerWalletAddress as BlockchainAddress,
    networkBlockchainExplorerURL:
      order.sellerMarketplace.network.blockchainExplorerURL,
    gas: recentTransaction.gas,
    transactionFee: recentTransaction.transactionFee,
    productThumbnailImageURL: productThumbnailImageURL,
  }
}

const getCancelledOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<CancelledOrder> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      cancelledAt: {
        not: null,
      },
      confirmedAt: null,
      refundedAt: null,
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
    },
  })

  if (!order) {
    throw new CancelledOrderDoesNotExist()
  }

  return {
    productTitle: order.product.title,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : '',
  }
}

const getRefundedOrder = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<RefundedOrder> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      cancelledAt: null,
      confirmedAt: {
        not: null,
      },
      refundedAt: {
        not: null,
      },
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
    },
  })

  if (!order) {
    throw new RefundedOrderDoesNotExist()
  }

  return {
    productTitle: order.product.title,
    refundedAt: order.refundedAt ? order.refundedAt.toISOString() : '',
  }
}

const getProductOrderStatus = async (
  buyerId: string,
  buyerProductOrderId: string
): Promise<OrderStatus> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: buyerId,
      id: buyerProductOrderId,
      sellerMarketplace: {
        confirmedAt: {
          not: null,
        },
      },
    },
    include: {
      transactions: {
        select: {
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
  })

  if (!order) {
    throw new OrderDoesNotExist()
  }

  const totalTransactions = order.transactions.length

  const confirmedTransactions = order.transactions.filter(
    (transaction) => transaction.confirmedAt !== null
  )

  // FIXME: I think it can be reordered to place most possible cases at the top of conditions
  if (order.refundedAt) {
    if (confirmedTransactions.length !== 1) {
      throw new RefundedOrderDoesNotHaveConfirmedTransaction()
    }

    return 'refunded'
  }

  if (order.cancelledAt) {
    if (totalTransactions === 0) {
      return 'cancelled'
    }

    if (confirmedTransactions.length > 0) {
      throw new CancelledOrderMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = order.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      throw new CancelledOrderMustNotHavePendingTransactions()
    }

    return 'cancelled'
  }

  if (order.confirmedAt) {
    if (confirmedTransactions.length !== 1) {
      throw new ConfirmedOrderDoesNotHaveConfirmedTransaction()
    }

    return 'confirmed'
  }

  if (order.pendingAt) {
    if (totalTransactions === 0) {
      throw new PendingOrderMustHaveTransactions()
    }

    if (confirmedTransactions.length > 0) {
      throw new PendingOrderMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = order.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      return 'awaiting_confirmation'
    }

    return 'pending'
  }

  if (totalTransactions > 0) {
    throw new DraftOrderMustNotHaveTransactions()
  }

  return 'draft'
}
