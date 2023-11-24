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

export class MarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('Marketplace does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    networkMarketplaceId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  id: string
  sellerId: string
  networkId: string
  networkMarketplaceId: string
}

export const getRecentDraftUserMarketplace = async (
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

  const recentMarketplace = await prisma.sellerMarketplace.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      networkMarketplaceId: validationResult.data.networkMarketplaceId,
      pendingAt: null,
      confirmedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })

  if (!recentMarketplace) {
    throw new MarketplaceDoesNotExist()
  }

  return {
    id: recentMarketplace.id,
    sellerId: recentMarketplace.sellerId,
    networkId: recentMarketplace.networkId,
    networkMarketplaceId: recentMarketplace.networkMarketplaceId,
  }
}
