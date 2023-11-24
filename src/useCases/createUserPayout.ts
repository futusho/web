import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
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

export class UserMarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('User marketplace does not exist')
  }
}

export class UserMarketplaceTokenDoesNotExist extends ClientError {
  constructor() {
    super('User marketplace token does not exist')
  }
}

export class PendingPayoutExists extends ClientError {
  constructor() {
    super('Pending payout exists')
  }
}

export class SQLReturnsInvalidRecords extends InternalServerError {
  constructor(recordsCount: number) {
    super(`Request returns invalid records: ${recordsCount}`)
  }
}

export class AvailableTokenBalanceIsNegative extends ClientError {
  constructor() {
    super('Available token balance is negative')
  }
}

export class NothingToRequest extends ClientError {
  constructor() {
    super('Nothing to request')
  }
}

interface TokenBalance {
  available: number
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceId: z.string().uuid(),
    userMarketplaceTokenId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const createUserPayout = async (request: Request): Promise<void> => {
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

  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      id: validationResult.data.userMarketplaceId,
      confirmedAt: {
        not: null,
      },
    },
  })

  if (!marketplace) {
    throw new UserMarketplaceDoesNotExist()
  }

  const marketplaceToken = await prisma.sellerMarketplaceToken.findFirst({
    where: {
      id: validationResult.data.userMarketplaceTokenId,
      sellerMarketplaceId: marketplace.id,
    },
    include: {
      networkMarketplaceToken: {
        select: {
          symbol: true,
          decimals: true,
        },
      },
    },
  })

  if (!marketplaceToken) {
    throw new UserMarketplaceTokenDoesNotExist()
  }

  const pendingPayouts = await prisma.sellerPayout.findMany({
    where: {
      sellerId: validationResult.data.userId,
      sellerMarketplaceId: marketplace.id,
      sellerMarketplaceTokenId: marketplaceToken.id,
      confirmedAt: null,
      cancelledAt: null,
    },
  })

  if (pendingPayouts.length > 0) {
    throw new PendingPayoutExists()
  }

  const result = await prisma.$queryRaw<TokenBalance[]>(
    Prisma.sql`
      SELECT COALESCE(seller_income, 0) - COALESCE(pending_payouts, 0) - COALESCE(confirmed_payouts, 0) AS available
      FROM (
        SELECT COALESCE(SUM(ps.seller_income), 0) AS seller_income
        FROM product_sales ps
        LEFT JOIN seller_marketplace_tokens smt ON smt.id = ps.seller_marketplace_token_id
        LEFT JOIN seller_marketplaces sm ON sm.id = smt.seller_marketplace_id
        LEFT JOIN network_marketplace_tokens nmt ON nmt.id = smt.network_marketplace_token_id
        WHERE ps.seller_id = ${validationResult.data.userId}::UUID
          AND sm.id = ${marketplace.id}::UUID
          AND smt.id = ${marketplaceToken.id}::UUID
      ) data
      LEFT JOIN (
        SELECT COALESCE(SUM(CASE WHEN confirmed_at IS NOT NULL THEN amount ELSE 0 END), 0) AS confirmed_payouts
          , COALESCE(SUM(CASE WHEN confirmed_at IS NULL THEN amount ELSE 0 END), 0) AS pending_payouts
        FROM seller_payouts
        WHERE seller_id = ${validationResult.data.userId}::UUID
          AND seller_marketplace_id = ${marketplace.id}::UUID
          AND seller_marketplace_token_id = ${marketplaceToken.id}::UUID
        AND cancelled_at IS NULL
        GROUP BY seller_marketplace_id, seller_marketplace_token_id
      ) AS sp ON TRUE;
    `
  )

  // FIXME: Uncovered with tests
  if (result.length !== 1) {
    throw new SQLReturnsInvalidRecords(result.length)
  }

  if (result[0].available < 0) {
    throw new AvailableTokenBalanceIsNegative()
  }

  if (result[0].available == 0) {
    throw new NothingToRequest()
  }

  await prisma.sellerPayout.create({
    data: {
      sellerId: validationResult.data.userId,
      sellerMarketplaceId: validationResult.data.userMarketplaceId,
      sellerMarketplaceTokenId: validationResult.data.userMarketplaceTokenId,
      amount: result[0].available,
      amountFormatted: `${result[0].available} ${marketplaceToken.networkMarketplaceToken.symbol}`,
      decimals: marketplaceToken.networkMarketplaceToken.decimals,
    },
  })
}
