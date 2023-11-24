import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type { BlockchainAddress } from '@/types/blockchain'
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

export class DraftMarketplaceMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft marketplace must not have transactions')
  }
}

export class ConfirmedMarketplaceMustHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed marketplace must have confirmed transaction')
  }
}

export class MarketplaceMustHaveTokens extends InternalServerError {
  constructor() {
    super('Marketplace must have tokens')
  }
}

export class MarketplaceDoesNotHaveOwnerWalletAddress extends InternalServerError {
  constructor() {
    super('Marketplace does not have owner wallet address')
  }
}

export class MarketplaceDoesNotHaveSmartContractAddress extends InternalServerError {
  constructor() {
    super('Marketplace does not have smart contract address')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface UserMarketplace {
  id: string
  networkTitle: string
  networkMarketplaceSmartContractAddress: BlockchainAddress
  smartContractAddress: BlockchainAddress | null
  ownerWalletAddress: BlockchainAddress | null
  commissionRate: number
  status: string
  tokens: string[]
}

export type Result = UserMarketplace[]

export const getUserMarketplaces = async (
  request: Request
): Promise<Result> => {
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

  const marketplaces = await prisma.sellerMarketplace.findMany({
    where: {
      sellerId: validationResult.data.userId,
    },
    include: {
      network: {
        select: {
          title: true,
        },
      },
      networkMarketplace: {
        select: {
          smartContractAddress: true,
          commissionRate: true,
        },
      },
      tokens: {
        include: {
          networkMarketplaceToken: {
            select: {
              symbol: true,
            },
          },
        },
      },
      sellerMarketplaceTransactions: {
        select: {
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return marketplaces.map((marketplace) => {
    let status = 'draft'

    if (marketplace.confirmedAt) {
      const confirmedTransactions =
        marketplace.sellerMarketplaceTransactions.filter(
          (transaction) => transaction.confirmedAt !== null
        )

      if (confirmedTransactions.length === 0) {
        throw new ConfirmedMarketplaceMustHaveConfirmedTransaction()
      }

      status = 'confirmed'
    } else if (marketplace.pendingAt) {
      // FIXME: Should we check here for confirmed transaction for a pending marketplace?

      const pendingTransactions =
        marketplace.sellerMarketplaceTransactions.filter(
          (transaction) => transaction.failedAt === null
        )

      if (pendingTransactions.length > 0) {
        status = 'awaiting_confirmation'
      }
    } else {
      if (marketplace.sellerMarketplaceTransactions.length > 0) {
        throw new DraftMarketplaceMustNotHaveTransactions()
      }
    }

    // NOTE: There is a critical situation, we should handle it properly
    if (status === 'confirmed') {
      if (!marketplace.ownerWalletAddress) {
        throw new MarketplaceDoesNotHaveOwnerWalletAddress()
      }

      if (!marketplace.smartContractAddress) {
        throw new MarketplaceDoesNotHaveSmartContractAddress()
      }
    }

    // FIXME: It could be moved before all validations
    if (marketplace.tokens.length === 0) {
      throw new MarketplaceMustHaveTokens()
    }

    return {
      id: marketplace.id,
      networkTitle: marketplace.network.title,
      networkMarketplaceSmartContractAddress: marketplace.networkMarketplace
        .smartContractAddress as BlockchainAddress,
      commissionRate: marketplace.networkMarketplace.commissionRate,
      smartContractAddress: marketplace.smartContractAddress
        ? (marketplace.smartContractAddress as BlockchainAddress)
        : null,
      ownerWalletAddress: marketplace.ownerWalletAddress
        ? (marketplace.ownerWalletAddress as BlockchainAddress)
        : null,
      tokens: marketplace.tokens.map(
        (token) => token.networkMarketplaceToken.symbol
      ),
      status: status,
    }
  })
}
