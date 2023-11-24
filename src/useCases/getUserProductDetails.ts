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
    userProductId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  id: string
  productCategoryTitle: string
  slug: string
  title: string
  priceFormatted: string
}

// NOTE: Used in product page
export const getUserProductDetails = async (
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

  const product = await prisma.product.findFirst({
    where: {
      sellerId: validationResult.data.userId,
      id: validationResult.data.userProductId,
    },
    include: {
      category: {
        select: {
          title: true,
        },
      },
    },
  })

  if (!product) {
    throw new ProductDoesNotExist()
  }

  return {
    id: product.id,
    productCategoryTitle: product.category.title,
    slug: product.slug,
    title: product.title,
    priceFormatted: product.priceFormatted,
  }
}
