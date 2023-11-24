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

export interface Token {
  id: string
  displayName: string
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export type Result = Token[]

// NOTE: Used in creation and updation user products pages
export const getUserMarketplaceTokens = async (
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

  const userMarketplaces = await prisma.sellerMarketplace.findMany({
    where: {
      sellerId: validationResult.data.userId,
      confirmedAt: {
        not: null,
      },
    },
    include: {
      network: {
        select: {
          title: true,
        },
      },
      tokens: {
        include: {
          networkMarketplaceToken: {
            select: {
              symbol: true,
            },
          },
        },
      },
    },
    orderBy: {
      network: {
        title: 'asc',
      },
    },
  })

  const tokens: Token[] = []

  userMarketplaces.forEach((userMarketplace) => {
    userMarketplace.tokens.forEach((token) => {
      tokens.push({
        id: token.id,
        displayName: `${userMarketplace.network.title} - ${token.networkMarketplaceToken.symbol}`,
      })
    })
  })

  return tokens
}
