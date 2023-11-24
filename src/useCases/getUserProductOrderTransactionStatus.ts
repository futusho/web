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

export class UserProductOrderDoesNotExist extends ClientError {
  constructor() {
    super('Order does not exist')
  }
}

export class UserProductOrderTransactionDoesNotExist extends ClientError {
  constructor() {
    super('Order transaction does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userProductOrderId: z.string().uuid(),
    userProductOrderTransactionId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export type Result = 'awaiting_confirmation' | 'confirmed' | 'failed'

export const getUserProductOrderTransactionStatus = async (
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

  await ensureUserProductOrderExists(
    validationResult.data.userId,
    validationResult.data.userProductOrderId
  )

  const transaction = await prisma.productOrderTransaction.findFirst({
    where: {
      id: validationResult.data.userProductOrderTransactionId,
      productOrder: {
        id: validationResult.data.userProductOrderId,
        buyerId: validationResult.data.userId,
      },
    },
  })

  if (!transaction) {
    throw new UserProductOrderTransactionDoesNotExist()
  }

  if (transaction.confirmedAt) {
    return 'confirmed'
  }

  if (transaction.failedAt) {
    return 'failed'
  }

  return 'awaiting_confirmation'
}

const ensureUserProductOrderExists = async (
  userId: string,
  userProductOrderId: string
): Promise<void> => {
  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: userId,
      id: userProductOrderId,
    },
  })

  if (!order) {
    throw new UserProductOrderDoesNotExist()
  }
}
