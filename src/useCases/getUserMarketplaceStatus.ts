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

export class MarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('Marketplace does not exist')
  }
}

export class DraftMarketplaceMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft marketplace must not have transactions')
  }
}

export class PendingMarketplaceMustHaveTransactions extends InternalServerError {
  constructor() {
    super('Pending marketplace must have transactions')
  }
}

export class PendingMarketplaceMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Pending marketplace must not have confirmed transactions')
  }
}

export class ConfirmedMarketplaceDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed marketplace does not have confirmed transaction')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export type Result = 'draft' | 'pending' | 'awaiting_confirmation' | 'confirmed'

export const getUserMarketplaceStatus = async (
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

  const marketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      id: validationResult.data.userMarketplaceId,
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

  // FIXME: Refactor this piece of code by extracting calculation into variables,
  // like confirmedTransactions, totalTransactions, etc.
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
