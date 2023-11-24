import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import {
  transactionHashErrorMessage,
  validateTransactionHash,
} from '@/validations/transactionHashValidation'
import {
  ClientError,
  ConflictError,
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

export class MarketplaceIsAlreadyConfirmed extends ConflictError {
  constructor() {
    super('Marketplace is already confirmed')
  }
}

export class ConfirmedTransactionFound extends InternalServerError {
  constructor() {
    super(
      'The marketplace is not in a confirmed state, but there is a confirmed transaction associated with it'
    )
  }
}

export class MarketplaceHasPendingTransaction extends ConflictError {
  constructor() {
    super(
      'There are pending transactions that must be processed before adding a new one'
    )
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceId: z.string().uuid(),
    transactionHash: z
      .string()
      .trim()
      .toLowerCase()
      .refine(validateTransactionHash, {
        message: transactionHashErrorMessage,
      }),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const addBlockchainTransactionToUserMarketplace = async (
  request: Request
): Promise<void> => {
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

  const userMarketplace = await prisma.sellerMarketplace.findFirst({
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

  if (!userMarketplace) {
    throw new MarketplaceDoesNotExist()
  }

  if (userMarketplace.confirmedAt) {
    throw new MarketplaceIsAlreadyConfirmed()
  }

  // TODO: It looks like unnecessary validation, because its almost impossible
  // to have confirmed transaction without having confirmed marketplace.
  const confirmedTransactions =
    userMarketplace.sellerMarketplaceTransactions.filter((tx) => tx.confirmedAt)

  if (confirmedTransactions.length > 0) {
    throw new ConfirmedTransactionFound()
  }

  const pendingTransactions =
    userMarketplace.sellerMarketplaceTransactions.filter(
      (tx) => tx.failedAt === null
    )

  if (pendingTransactions.length > 0) {
    throw new MarketplaceHasPendingTransaction()
  }

  const tx = []

  if (!userMarketplace.pendingAt) {
    tx.push(
      prisma.sellerMarketplace.update({
        data: {
          pendingAt: new Date(),
        },
        where: {
          id: validationResult.data.userMarketplaceId,
        },
      })
    )
  }

  tx.push(
    prisma.sellerMarketplaceTransaction.create({
      data: {
        networkId: userMarketplace.networkId,
        sellerId: validationResult.data.userId,
        sellerMarketplaceId: validationResult.data.userMarketplaceId,
        hash: validationResult.data.transactionHash,
      },
    })
  )

  await prisma.$transaction(tx)
}
