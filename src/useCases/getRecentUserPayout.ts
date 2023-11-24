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
    super('User payout does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceId: z.string().uuid(),
    userMarketplaceTokenId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  id: string
}

// NOTE: Used only in API while creating a new user payout
export const getRecentUserPayout = async (
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

  const recentUserPayout = await prisma.sellerPayout.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      sellerMarketplaceId: validationResult.data.userMarketplaceId,
      sellerMarketplaceTokenId: validationResult.data.userMarketplaceTokenId,
      pendingAt: null,
      confirmedAt: null,
      cancelledAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })

  if (!recentUserPayout) {
    throw new UserPayoutDoesNotExist()
  }

  return {
    id: recentUserPayout.id,
  }
}
