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

export class ProductOrderDoesNotExist extends ClientError {
  constructor() {
    super('Product order does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    sellerProductId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  id: string
  userId: string
  productId: string
  priceFormatted: string
}

// FIXME: Rename to getRecentBuyerProductOrder
// NOTE: Used only in API while creating a new product order
export const getRecentProductOrderForBuyer = async (
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

  const recentProductOrder = await prisma.productOrder.findFirst({
    where: {
      buyerId: validationResult.data.userId,
      productId: validationResult.data.sellerProductId,
      pendingAt: null,
      confirmedAt: null,
      cancelledAt: null,
      refundedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })

  if (!recentProductOrder) {
    throw new ProductOrderDoesNotExist()
  }

  return {
    id: recentProductOrder.id,
    userId: recentProductOrder.buyerId,
    productId: recentProductOrder.productId,
    priceFormatted: recentProductOrder.priceFormatted,
  }
}
