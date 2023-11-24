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

export class PayoutDoesNotExist extends ClientError {
  constructor() {
    super('Payout does not exist')
  }
}

export class DraftPayoutDoesNotExist extends InternalServerError {
  constructor() {
    super('Draft payout does not exist')
  }
}

export class PendingPayoutDoesNotExist extends InternalServerError {
  constructor() {
    super('Pending payout does not exist')
  }
}

export class UnconfirmedPayoutDoesNotExist extends InternalServerError {
  constructor() {
    super('Unconfirmed payout does not exist')
  }
}

export class ConfirmedPayoutDoesNotExist extends InternalServerError {
  constructor() {
    super('Confirmed payout does not exist')
  }
}

export class CancelledPayoutDoesNotExist extends InternalServerError {
  constructor() {
    super('Cancelled payout does not exist')
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

export class CancelledPayoutMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Cancelled payout must not have confirmed transactions')
  }
}

export class CancelledPayoutMustNotHavePendingTransactions extends InternalServerError {
  constructor() {
    super('Cancelled payout must not have pending transactions')
  }
}

export class ConfirmedPayoutDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed payout does not have confirmed transaction')
  }
}

export class PendingPayoutMustHaveTransactions extends InternalServerError {
  constructor() {
    super('Pending payout must have transactions')
  }
}

export class PendingPayoutMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Pending payout must not have confirmed transactions')
  }
}

export class DraftPayoutMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft payout must not have transactions')
  }
}

export class ConfirmedPayoutTransactionDoesNotHaveGas extends InternalServerError {
  constructor() {
    super('Confirmed payout transaction does not have gas')
  }
}

export class ConfirmedPayoutTransactionDoesNotHaveTransactionFee extends InternalServerError {
  constructor() {
    super('Confirmed payout transaction does not have transaction fee')
  }
}

type PayoutStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_confirmation'
  | 'cancelled'
  | 'confirmed'

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userPayoutId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

interface FailedPayoutTransaction {
  transactionHash: BlockchainTransactionHash
  date: string
}

type UnpaidPayout = {
  id: string
  networkChainId: number
  sellerMarketplaceSmartContractAddress: BlockchainAddress
  networkBlockchainExplorerURL: string
  amountFormatted: string
}

type DraftPayout = UnpaidPayout

export type DraftPayoutCoin = DraftPayout & {
  amountInCoins: string
}

export type DraftPayoutERC20 = DraftPayout & {
  tokenSmartContractAddress: BlockchainAddress
  amountInTokens: string
}

type PendingPayout = UnpaidPayout & {
  failedTransactions: FailedPayoutTransaction[]
}

export type PendingPayoutCoin = PendingPayout & {
  amountInCoins: string
}

export type PendingPayoutERC20 = PendingPayout & {
  tokenSmartContractAddress: BlockchainAddress
  amountInTokens: string
}

export type UnconfirmedPayout = {
  id: string
  transactionId: string
  transactionHash: BlockchainTransactionHash
  networkBlockchainExplorerURL: string
}

export type ConfirmedPayout = {
  confirmedAt: string
  gas: number
  transactionFee: string
}

export type CancelledPayout = {
  cancelledAt: string
}

export type UserPayout =
  | DraftPayoutCoin
  | DraftPayoutERC20
  | PendingPayoutCoin
  | PendingPayoutERC20
  | UnconfirmedPayout
  | ConfirmedPayout
  | CancelledPayout

export const getUserPayoutBasedOnStatus = async (
  request: Request
): Promise<UserPayout> => {
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

  const payoutStatus = await getPayoutStatus(
    validationResult.data.userId,
    validationResult.data.userPayoutId
  )

  switch (payoutStatus) {
    case 'draft': {
      return await getDraftPayout(
        validationResult.data.userId,
        validationResult.data.userPayoutId
      )
    }

    case 'pending': {
      return await getPendingPayout(
        validationResult.data.userId,
        validationResult.data.userPayoutId
      )
    }

    case 'awaiting_confirmation': {
      return await getUnconfirmedPayout(
        validationResult.data.userId,
        validationResult.data.userPayoutId
      )
    }

    case 'confirmed': {
      return await getConfirmedPayout(
        validationResult.data.userId,
        validationResult.data.userPayoutId
      )
    }

    case 'cancelled': {
      return await getCancelledPayout(
        validationResult.data.userId,
        validationResult.data.userPayoutId
      )
    }

    default: {
      throw new Error(`Unknown payout status ${payoutStatus}`)
    }
  }
}

const getDraftPayout = async (
  userId: string,
  payoutId: string
): Promise<DraftPayoutCoin | DraftPayoutERC20> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: payoutId,
      cancelledAt: null,
      confirmedAt: null,
    },
    include: {
      sellerMarketplace: {
        include: {
          network: {
            select: {
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

  if (!payout) {
    throw new DraftPayoutDoesNotExist()
  }

  const sellerMarketplace = payout.sellerMarketplace

  if (!isAddress(sellerMarketplace.ownerWalletAddress)) {
    throw new SellerMarketplaceDoesNotHaveValidOwnerWalletAddress()
  }

  if (!isAddress(sellerMarketplace.smartContractAddress)) {
    throw new SellerMarketplaceDoesNotHaveValidSmartContractAddress()
  }

  const network = sellerMarketplace.network
  const networkMarketplaceToken =
    payout.sellerMarketplaceToken.networkMarketplaceToken

  const draftOrder: DraftPayout = {
    id: payout.id,
    amountFormatted: payout.amountFormatted,
    networkChainId: network.chainId,
    sellerMarketplaceSmartContractAddress:
      sellerMarketplace.smartContractAddress as BlockchainAddress,
    networkBlockchainExplorerURL: network.blockchainExplorerURL,
  }

  if (networkMarketplaceToken.smartContractAddress) {
    // ERC20 token

    // FIXME: Uncovered with tests
    if (!isAddress(networkMarketplaceToken.smartContractAddress)) {
      throw new NetworkMarketplaceTokenDoesNotHaveValidSmartContractAddress()
    }

    return {
      ...draftOrder,
      tokenSmartContractAddress:
        networkMarketplaceToken.smartContractAddress as BlockchainAddress,
      amountInTokens: parseUnits(
        payout.amount.toString(),
        payout.decimals
      ).toString(),
    } as DraftPayoutERC20
  }

  // Native coin
  return {
    ...draftOrder,
    amountInCoins: parseUnits(
      payout.amount.toString(),
      payout.decimals
    ).toString(),
  } as DraftPayoutCoin
}

const getPendingPayout = async (
  userId: string,
  payoutId: string
): Promise<PendingPayoutCoin | PendingPayoutERC20> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: payoutId,
      cancelledAt: null,
      confirmedAt: null,
    },
    include: {
      sellerMarketplace: {
        include: {
          network: {
            select: {
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

  if (!payout) {
    throw new PendingPayoutDoesNotExist()
  }

  const sellerMarketplace = payout.sellerMarketplace

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
    payout.sellerMarketplaceToken.networkMarketplaceToken

  const pendingPayout: PendingPayout = {
    id: payout.id,
    amountFormatted: payout.amountFormatted,
    networkChainId: network.chainId,
    sellerMarketplaceSmartContractAddress:
      sellerMarketplace.smartContractAddress as BlockchainAddress,
    networkBlockchainExplorerURL: network.blockchainExplorerURL,
    failedTransactions: payout.transactions.map((transaction) => ({
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
      ...pendingPayout,
      tokenSmartContractAddress:
        networkMarketplaceToken.smartContractAddress as BlockchainAddress,
      amountInTokens: parseUnits(
        payout.amount.toString(),
        payout.decimals
      ).toString(),
    } as PendingPayoutERC20
  }

  // Native coin
  return {
    ...pendingPayout,
    amountInCoins: parseUnits(
      payout.amount.toString(),
      payout.decimals
    ).toString(),
  } as PendingPayoutCoin
}

const getUnconfirmedPayout = async (
  userId: string,
  userPayoutId: string
): Promise<UnconfirmedPayout> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: userPayoutId,
      pendingAt: {
        not: null,
      },
      cancelledAt: null,
      confirmedAt: null,
    },
    include: {
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

  if (!payout) {
    throw new UnconfirmedPayoutDoesNotExist()
  }

  const recentTransaction = payout.transactions[0]

  return {
    id: payout.id,
    transactionId: recentTransaction.id,
    networkBlockchainExplorerURL:
      payout.sellerMarketplace.network.blockchainExplorerURL,
    transactionHash: recentTransaction.hash as BlockchainTransactionHash,
  }
}

const getConfirmedPayout = async (
  userId: string,
  userPayoutId: string
): Promise<ConfirmedPayout> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: userPayoutId,
      cancelledAt: null,
      confirmedAt: {
        not: null,
      },
    },
    include: {
      transactions: {
        select: {
          confirmedAt: true,
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

  if (!payout) {
    throw new ConfirmedPayoutDoesNotExist()
  }

  const recentTransaction = payout.transactions[0]

  if (!recentTransaction.gas) {
    // FIXME: Uncovered with tests
    throw new ConfirmedPayoutTransactionDoesNotHaveGas()
  }

  if (!recentTransaction.transactionFee) {
    // FIXME: Uncovered with tests
    throw new ConfirmedPayoutTransactionDoesNotHaveTransactionFee()
  }

  return {
    confirmedAt: payout.confirmedAt ? payout.confirmedAt.toISOString() : '',
    gas: recentTransaction.gas,
    transactionFee: recentTransaction.transactionFee,
  }
}

const getCancelledPayout = async (
  userId: string,
  userPayoutId: string
): Promise<CancelledPayout> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: userPayoutId,
      cancelledAt: {
        not: null,
      },
      confirmedAt: null,
    },
  })

  if (!payout) {
    throw new CancelledPayoutDoesNotExist()
  }

  return {
    cancelledAt: payout.cancelledAt ? payout.cancelledAt.toISOString() : '',
  }
}

const getPayoutStatus = async (
  userId: string,
  payoutId: string
): Promise<PayoutStatus> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: payoutId,
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

  if (!payout) {
    throw new PayoutDoesNotExist()
  }

  const totalTransactions = payout.transactions.length

  const confirmedTransactions = payout.transactions.filter(
    (transaction) => transaction.confirmedAt !== null
  )

  if (payout.cancelledAt) {
    if (totalTransactions === 0) {
      return 'cancelled'
    }

    if (confirmedTransactions.length > 0) {
      throw new CancelledPayoutMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = payout.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      throw new CancelledPayoutMustNotHavePendingTransactions()
    }

    return 'cancelled'
  }

  if (payout.confirmedAt) {
    if (confirmedTransactions.length !== 1) {
      throw new ConfirmedPayoutDoesNotHaveConfirmedTransaction()
    }

    return 'confirmed'
  }

  if (payout.pendingAt) {
    if (totalTransactions === 0) {
      throw new PendingPayoutMustHaveTransactions()
    }

    if (confirmedTransactions.length > 0) {
      throw new PendingPayoutMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = payout.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      return 'awaiting_confirmation'
    }

    return 'pending'
  }

  if (totalTransactions > 0) {
    throw new DraftPayoutMustNotHaveTransactions()
  }

  return 'draft'
}
