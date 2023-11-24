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

export class MarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('Marketplace does not exist')
  }
}

export class UnknownMarketplaceStatus extends InternalServerError {
  constructor(status: string) {
    super(`Unknown marketplace status: ${status}`)
  }
}

export class DraftMarketplaceDoesNotExist extends InternalServerError {
  constructor() {
    super('Draft marketplace does not exist')
  }
}

export class DraftMarketplaceMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft marketplace must not have transactions')
  }
}

export class PendingMarketplaceDoesNotExist extends InternalServerError {
  constructor() {
    super('Pending marketplace does not exist')
  }
}

export class PendingMarketplaceMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Pending marketplace must not have confirmed transactions')
  }
}

export class PendingMarketplaceMustHaveTransactions extends InternalServerError {
  constructor() {
    super('Pending marketplace must have transactions')
  }
}

export class UnconfirmedMarketplaceDoesNotExist extends InternalServerError {
  constructor() {
    super('Unconfirmed marketplace does not exist')
  }
}

export class UnconfirmedMarketplaceDoesNotHavePendingTransaction extends InternalServerError {
  constructor() {
    super('Unconfirmed marketplace does not have pending transaction')
  }
}

export class ConfirmedMarketplaceDoesNotExist extends InternalServerError {
  constructor() {
    super('Confirmed marketplace does not exist')
  }
}

export class ConfirmedMarketplaceDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed marketplace does not have confirmed transaction')
  }
}

export class ConfirmedMarketplaceMustHaveSmartContractAddress extends InternalServerError {
  constructor() {
    super('Confirmed marketplace must have smart contract address')
  }
}

export class ConfirmedMarketplaceMustHaveOwnerWalletAddress extends InternalServerError {
  constructor() {
    super('Confirmed marketplace must have owner wallet address')
  }
}

export class ConfirmedMarketplaceTransactionMustHaveGas extends InternalServerError {
  constructor() {
    super('Confirmed marketplace transaction must have gas')
  }
}

export class ConfirmedMarketplaceTransactionMustHaveTransactionFee extends InternalServerError {
  constructor() {
    super('Confirmed marketplace transaction must have transaction fee')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

type MarketplaceStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_confirmation'
  | 'confirmed'

interface FailedTransaction {
  transactionHash: BlockchainTransactionHash
  date: Date | null
}

export type DraftMarketplace = {
  id: string
  sellerId: string
  networkChainId: number
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  blockchainExplorerURL: string
}

export type PendingMarketplace = {
  id: string
  sellerId: string
  networkChainId: number
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  blockchainExplorerURL: string
  failedTransactions: FailedTransaction[]
}

export type UnconfirmedMarketplace = {
  id: string
  networkTitle: string
  transactionHash: BlockchainTransactionHash
  blockchainExplorerURL: string
}

export type ConfirmedMarketplace = {
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  marketplaceSmartContractAddress: BlockchainAddress
  ownerWalletAddress: BlockchainAddress
  commissionRate: number
  confirmedAt: string
  gas: number
  transactionFee: string
}

export type Marketplace =
  | DraftMarketplace
  | PendingMarketplace
  | UnconfirmedMarketplace
  | ConfirmedMarketplace

export const getUserMarketplaceBasedOnStatus = async (
  request: Request
): Promise<Marketplace> => {
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

  const marketplaceStatus = await getUserMarketplaceStatus(
    validationResult.data.userId,
    validationResult.data.userMarketplaceId
  )

  switch (marketplaceStatus) {
    case 'draft': {
      return await getDraftMarketplace(
        validationResult.data.userId,
        validationResult.data.userMarketplaceId
      )
    }

    case 'pending': {
      return await getPendingMarketplace(
        validationResult.data.userId,
        validationResult.data.userMarketplaceId
      )
    }

    case 'awaiting_confirmation': {
      return await getUnconfirmedMarketplace(
        validationResult.data.userId,
        validationResult.data.userMarketplaceId
      )
    }

    case 'confirmed': {
      return await getConfirmedMarketplace(
        validationResult.data.userId,
        validationResult.data.userMarketplaceId
      )
    }

    default: {
      throw new UnknownMarketplaceStatus(marketplaceStatus)
    }
  }
}

// NOTE: This function is a full copy of getUserMarketplaceStatus useCase
const getUserMarketplaceStatus = async (
  userId: string,
  userMarketplaceId: string
): Promise<MarketplaceStatus> => {
  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: userId,
      id: userMarketplaceId,
    },
    include: {
      sellerMarketplaceTransactions: {
        select: {
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
  })

  if (!marketplace) {
    throw new MarketplaceDoesNotExist()
  }

  if (marketplace.confirmedAt) {
    const confirmedTransactions =
      marketplace.sellerMarketplaceTransactions.filter(
        (transaction) => transaction.confirmedAt !== null
      )

    if (confirmedTransactions.length !== 1) {
      throw new ConfirmedMarketplaceDoesNotHaveConfirmedTransaction()
    }

    return 'confirmed'
  }

  if (marketplace.pendingAt) {
    if (marketplace.sellerMarketplaceTransactions.length === 0) {
      throw new PendingMarketplaceMustHaveTransactions()
    }

    const confirmedTransactions =
      marketplace.sellerMarketplaceTransactions.filter(
        (transaction) => transaction.confirmedAt !== null
      )

    if (confirmedTransactions.length > 0) {
      throw new PendingMarketplaceMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions =
      marketplace.sellerMarketplaceTransactions.filter(
        (transaction) => transaction.failedAt === null
      )

    if (pendingTransactions.length > 0) {
      return 'awaiting_confirmation'
    } else {
      return 'pending'
    }
  }

  if (marketplace.sellerMarketplaceTransactions.length > 0) {
    throw new DraftMarketplaceMustNotHaveTransactions()
  }

  return 'draft'
}

const getDraftMarketplace = async (
  userId: string,
  userMarketplaceId: string
): Promise<DraftMarketplace> => {
  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: userId,
      id: userMarketplaceId,
    },
    include: {
      networkMarketplace: {
        select: {
          smartContractAddress: true,
        },
      },
      network: {
        select: {
          title: true,
          chainId: true,
          blockchainExplorerURL: true,
        },
      },
      sellerMarketplaceTransactions: true,
    },
  })

  if (!marketplace) {
    throw new DraftMarketplaceDoesNotExist()
  }

  if (marketplace.sellerMarketplaceTransactions.length > 0) {
    throw new DraftMarketplaceMustNotHaveTransactions()
  }

  return {
    id: marketplace.id,
    sellerId: marketplace.sellerId,
    networkChainId: marketplace.network.chainId,
    networkTitle: marketplace.network.title,
    networkMarketplaceSmartContractAddress: marketplace.networkMarketplace
      .smartContractAddress as BlockchainAddress,
    blockchainExplorerURL: marketplace.network.blockchainExplorerURL,
  }
}

const getPendingMarketplace = async (
  userId: string,
  userMarketplaceId: string
): Promise<PendingMarketplace> => {
  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: userId,
      id: userMarketplaceId,
    },
    include: {
      networkMarketplace: {
        select: {
          smartContractAddress: true,
        },
      },
      network: {
        select: {
          title: true,
          chainId: true,
          blockchainExplorerURL: true,
        },
      },
      sellerMarketplaceTransactions: {
        select: {
          hash: true,
          failedAt: true,
        },
        orderBy: {
          failedAt: 'desc',
        },
      },
    },
  })

  if (!marketplace) {
    throw new PendingMarketplaceDoesNotExist()
  }

  if (marketplace.sellerMarketplaceTransactions.length === 0) {
    throw new PendingMarketplaceMustHaveTransactions()
  }

  return {
    id: marketplace.id,
    sellerId: marketplace.sellerId,
    networkChainId: marketplace.network.chainId,
    networkTitle: marketplace.network.title,
    networkMarketplaceSmartContractAddress: marketplace.networkMarketplace
      .smartContractAddress as BlockchainAddress,
    blockchainExplorerURL: marketplace.network.blockchainExplorerURL,
    failedTransactions: marketplace.sellerMarketplaceTransactions.map((tx) => ({
      transactionHash: tx.hash as BlockchainTransactionHash,
      date: tx.failedAt,
    })),
  }
}

const getUnconfirmedMarketplace = async (
  userId: string,
  userMarketplaceId: string
): Promise<UnconfirmedMarketplace> => {
  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: userId,
      id: userMarketplaceId,
      pendingAt: {
        not: null,
      },
      confirmedAt: null,
    },
    include: {
      network: {
        select: {
          title: true,
          blockchainExplorerURL: true,
        },
      },
      sellerMarketplaceTransactions: {
        where: {
          confirmedAt: null,
          failedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!marketplace) {
    throw new UnconfirmedMarketplaceDoesNotExist()
  }

  // We couldn't have more than one pending transaction
  if (marketplace.sellerMarketplaceTransactions.length != 1) {
    // NOTE: This case is unable to cover by tests
    throw new UnconfirmedMarketplaceDoesNotHavePendingTransaction()
  }

  return {
    id: marketplace.id,
    networkTitle: marketplace.network.title,
    transactionHash: marketplace.sellerMarketplaceTransactions[0]
      .hash as BlockchainAddress,
    blockchainExplorerURL: marketplace.network.blockchainExplorerURL,
  }
}

const getConfirmedMarketplace = async (
  userId: string,
  userMarketplaceId: string
): Promise<ConfirmedMarketplace> => {
  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: userId,
      id: userMarketplaceId,
      confirmedAt: {
        not: null,
      },
    },
    include: {
      networkMarketplace: {
        select: {
          smartContractAddress: true,
          commissionRate: true,
        },
      },
      network: {
        select: {
          title: true,
          blockchainExplorerURL: true,
        },
      },
      sellerMarketplaceTransactions: {
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

  if (!marketplace) {
    throw new ConfirmedMarketplaceDoesNotExist()
  }

  if (marketplace.sellerMarketplaceTransactions.length !== 1) {
    throw new ConfirmedMarketplaceDoesNotHaveConfirmedTransaction()
  }

  if (!marketplace.smartContractAddress) {
    throw new ConfirmedMarketplaceMustHaveSmartContractAddress()
  }

  if (!marketplace.ownerWalletAddress) {
    throw new ConfirmedMarketplaceMustHaveOwnerWalletAddress()
  }

  // TODO: Check for required fields:
  // - marketplaceSmartContractAddress
  // - ownerWalletAddress
  // - gas
  // - transactionFee
  // In ideal scenario all of these fields must be filled and couldn't be empty

  const confirmedTransaction = marketplace.sellerMarketplaceTransactions[0]

  if (!confirmedTransaction.gas) {
    throw new ConfirmedMarketplaceTransactionMustHaveGas()
  }

  if (!confirmedTransaction.transactionFee) {
    throw new ConfirmedMarketplaceTransactionMustHaveTransactionFee()
  }

  return {
    networkTitle: marketplace.network.title,
    networkMarketplaceSmartContractAddress: marketplace.networkMarketplace
      .smartContractAddress as BlockchainAddress,
    marketplaceSmartContractAddress:
      marketplace.smartContractAddress as BlockchainAddress,
    ownerWalletAddress: marketplace.ownerWalletAddress as BlockchainAddress,
    commissionRate: marketplace.networkMarketplace.commissionRate,
    gas: confirmedTransaction.gas,
    transactionFee: confirmedTransaction.transactionFee,
    confirmedAt: confirmedTransaction.confirmedAt
      ? confirmedTransaction.confirmedAt.toISOString()
      : '',
  }
}
