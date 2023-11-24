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

export class NetworkMarketplaceDoesNotExist extends ClientError {
  constructor() {
    super('Network marketplace does not exist')
  }
}

export class NetworkMarketplaceDoesNotHaveTokens extends InternalServerError {
  constructor() {
    super('Network marketplace does not have tokens')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    networkMarketplaceId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const createDraftUserMarketplace = async (
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

  const networkMarketplace = await prisma.networkMarketplace.findUnique({
    where: {
      id: validationResult.data.networkMarketplaceId,
    },
    include: {
      tokens: {
        select: {
          // FIXME: Replace it with _count
          id: true,
        },
      },
    },
  })

  if (!networkMarketplace) {
    throw new NetworkMarketplaceDoesNotExist()
  }

  if (networkMarketplace.tokens.length === 0) {
    throw new NetworkMarketplaceDoesNotHaveTokens()
  }

  await prisma.sellerMarketplace.create({
    data: {
      sellerId: validationResult.data.userId,
      networkMarketplaceId: networkMarketplace.id,
      networkId: networkMarketplace.networkId,
      smartContractAddress: '',
      ownerWalletAddress: '',
      tokens: {
        create: networkMarketplace.tokens.map((token) => ({
          networkMarketplaceTokenId: token.id,
        })),
      },
    },
  })
}
