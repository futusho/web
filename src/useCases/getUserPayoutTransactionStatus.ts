import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class UserPayoutDoesNotExist extends ClientError {
  constructor() {
    super('Payout does not exist')
  }
}

export class UserPayoutTransactionDoesNotExist extends ClientError {
  constructor() {
    super('Payout transaction does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userPayoutId: z.string().uuid(),
    userPayoutTransactionId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export type Result = 'awaiting_confirmation' | 'confirmed' | 'failed'

export const getUserPayoutTransactionStatus = async (
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

  await ensureUserPayoutExists(
    validationResult.data.userId,
    validationResult.data.userPayoutId
  )

  const transaction = await prisma.sellerPayoutTransaction.findFirst({
    where: {
      id: validationResult.data.userPayoutTransactionId,
      sellerPayout: {
        id: validationResult.data.userPayoutId,
        sellerId: validationResult.data.userId,
      },
    },
  })

  if (!transaction) {
    throw new UserPayoutTransactionDoesNotExist()
  }

  if (transaction.confirmedAt) {
    return 'confirmed'
  }

  if (transaction.failedAt) {
    return 'failed'
  }

  return 'awaiting_confirmation'
}

const ensureUserPayoutExists = async (
  userId: string,
  userPayoutId: string
): Promise<void> => {
  const payout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: userId,
      id: userPayoutId,
    },
  })

  if (!payout) {
    throw new UserPayoutDoesNotExist()
  }
}
