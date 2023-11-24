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

export class PayoutDoesNotExist extends ClientError {
  constructor() {
    super('Payout does not exist')
  }
}

export class PayoutWasConfirmed extends ConflictError {
  constructor() {
    super('Payout was confirmed')
  }
}

export class PayoutWasCancelled extends ConflictError {
  constructor() {
    super('Payout was cancelled')
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

export class PendingPayoutHasPendingTransaction extends ConflictError {
  constructor() {
    super('Pending payout has pending transaction')
  }
}

export class DraftPayoutMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft payout must not have transactions')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userPayoutId: z.string().uuid(),
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

export const addBlockchainTransactionToUserPayout = async (
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

  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      id: validationResult.data.userPayoutId,
    },
    include: {
      sellerMarketplace: {
        select: {
          networkId: true,
        },
      },
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

  if (payout.confirmedAt) {
    throw new PayoutWasConfirmed()
  }

  if (payout.cancelledAt) {
    throw new PayoutWasCancelled()
  }

  if (payout.pendingAt) {
    if (payout.transactions.length === 0) {
      throw new PendingPayoutMustHaveTransactions()
    }

    // FIXME: This situation is almost impossible.
    const confirmedTransactions = payout.transactions.filter(
      (tx) => tx.confirmedAt
    )

    if (confirmedTransactions.length > 0) {
      throw new PendingPayoutMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = payout.transactions.filter(
      (tx) => tx.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      throw new PendingPayoutHasPendingTransaction()
    }

    await prisma.sellerPayoutTransaction.create({
      data: {
        sellerPayoutId: payout.id,
        networkId: payout.sellerMarketplace.networkId,
        hash: validationResult.data.transactionHash,
      },
    })

    return
  }

  if (payout.transactions.length > 0) {
    throw new DraftPayoutMustNotHaveTransactions()
  }

  const tx = []

  tx.push(
    prisma.sellerPayout.update({
      data: {
        pendingAt: new Date(),
      },
      where: {
        id: validationResult.data.userPayoutId,
      },
    })
  )

  tx.push(
    prisma.sellerPayoutTransaction.create({
      data: {
        sellerPayoutId: payout.id,
        networkId: payout.sellerMarketplace.networkId,
        hash: validationResult.data.transactionHash,
      },
    })
  )

  await prisma.$transaction(tx)
}
