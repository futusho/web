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

export class ProductDoesNotExist extends ClientError {
  constructor() {
    super('Product does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceTokenId: z.string().uuid(),
    productCategoryId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  id: string
  userId: string
  productCategoryId: string
  userMarketplaceTokenId: string
  slug: string
  title: string
  description: string
  content: string
  priceFormatted: string
}

// NOTE: Used only in API while creating a new product draft
export const getRecentUserProduct = async (
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

  const recentUserProduct = await prisma.product.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      categoryId: validationResult.data.productCategoryId,
      sellerMarketplaceTokenId: validationResult.data.userMarketplaceTokenId,
      publishedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })

  if (!recentUserProduct) {
    throw new ProductDoesNotExist()
  }

  return {
    id: recentUserProduct.id,
    userId: recentUserProduct.sellerId,
    productCategoryId: recentUserProduct.categoryId,
    userMarketplaceTokenId: recentUserProduct.sellerMarketplaceTokenId,
    slug: recentUserProduct.slug,
    title: recentUserProduct.title,
    description: recentUserProduct.description ?? '',
    content: recentUserProduct.content ?? '',
    priceFormatted: recentUserProduct.priceFormatted,
  }
}
