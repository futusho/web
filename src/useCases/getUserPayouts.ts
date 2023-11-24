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

export class DraftPayoutMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft payout must not have transactions')
  }
}

export class ConfirmedPayoutMustHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed payout must have confirmed transaction')
  }
}

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface UserPayout {
  id: string
  networkTitle: string
  amountFormatted: string
  status: string
  date: string
}

export type Result = UserPayout[]

export const getUserPayouts = async (request: Request): Promise<Result> => {
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

  const payouts = await prisma.sellerPayout.findMany({
    where: {
      sellerId: validationResult.data.userId,
    },
    include: {
      sellerMarketplace: {
        include: {
          network: {
            select: {
              title: true,
            },
          },
        },
      },
      transactions: {
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

  return payouts.map((payout) => {
    let status = 'draft'

    if (payout.confirmedAt) {
      // NOTE: Actually we don't need to verify these statements,
      // because its only for a development purpose to have valid database records
      const confirmedTransactions = payout.transactions.filter(
        (transaction) => transaction.confirmedAt !== null
      )

      if (confirmedTransactions.length === 0) {
        throw new ConfirmedPayoutMustHaveConfirmedTransaction()
      }

      status = 'confirmed'
    } else if (payout.pendingAt) {
      // FIXME: Should we check here for confirmed transaction for a pending payout?

      const pendingTransactions = payout.transactions.filter(
        (transaction) => transaction.failedAt === null
      )

      if (pendingTransactions.length > 0) {
        status = 'awaiting_confirmation'
      }
    } else if (payout.cancelledAt) {
      status = 'cancelled'
    } else {
      if (payout.transactions.length > 0) {
        throw new DraftPayoutMustNotHaveTransactions()
      }
    }

    return {
      id: payout.id,
      networkTitle: payout.sellerMarketplace.network.title,
      amountFormatted: payout.amountFormatted,
      date: payout.createdAt.toISOString(),
      status: status,
    }
  })
}
