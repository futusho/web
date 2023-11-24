import { v4 as uuidv4 } from 'uuid'
import { formatUnits, parseUnits } from 'viem'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { toSlug } from '@/lib/utils/slugify'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class TokenDoesNotExist extends ClientError {
  constructor() {
    super('Token does not exist')
  }
}

export class InvalidProductPrice extends ClientError {
  constructor() {
    super('Invalid product price')
  }
}

export class ProductPriceMustBePositive extends ClientError {
  constructor() {
    super('Product price must be positive')
  }
}

export class ProductCategoryDoesNotExist extends ClientError {
  constructor() {
    super('Product category does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userMarketplaceTokenId: z.string().uuid(),
    productCategoryId: z.string().uuid(),
    productTitle: z.string().trim().min(1),
    productDescription: z.string().trim(),
    // Here is we expect to have stringified human-readable price, like '1234.567890'
    productPrice: z.string().trim().min(1),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const createUserProduct = async (request: Request): Promise<void> => {
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

  const userMarketplaceToken = await prisma.sellerMarketplaceToken.findFirst({
    where: {
      id: validationResult.data.userMarketplaceTokenId,
      sellerMarketplace: {
        sellerId: validationResult.data.userId,
      },
    },
    include: {
      networkMarketplaceToken: {
        select: {
          decimals: true,
          symbol: true,
        },
      },
    },
  })

  if (!userMarketplaceToken) {
    throw new TokenDoesNotExist()
  }

  const { decimals, symbol } = userMarketplaceToken.networkMarketplaceToken

  let priceInUnits: bigint

  try {
    priceInUnits = parseUnits(validationResult.data.productPrice, decimals)
  } catch (e) {
    throw new InvalidProductPrice()
  }

  if (priceInUnits <= 0) {
    throw new ProductPriceMustBePositive()
  }

  const price = formatUnits(priceInUnits, decimals)

  await ensureProductCategoryExists(validationResult.data.productCategoryId)

  let productSlug = toSlug(validationResult.data.productTitle)

  const slugExists = await isProductSlugExists(
    validationResult.data.userId,
    productSlug
  )

  if (slugExists) {
    productSlug = uuidv4()
  }

  await prisma.product.create({
    data: {
      sellerId: validationResult.data.userId,
      sellerMarketplaceTokenId: validationResult.data.userMarketplaceTokenId,
      categoryId: validationResult.data.productCategoryId,
      slug: productSlug,
      title: validationResult.data.productTitle,
      description: validationResult.data.productDescription,
      content: '',
      price: price,
      priceDecimals: decimals,
      priceFormatted: price + ' ' + symbol,
    },
  })
}

const ensureProductCategoryExists = async (
  productCategoryId: string
): Promise<void> => {
  const exists = await prisma.productCategory.findUnique({
    where: {
      id: productCategoryId,
    },
  })

  if (!exists) {
    throw new ProductCategoryDoesNotExist()
  }
}

const isProductSlugExists = async (
  userId: string,
  productSlug: string
): Promise<boolean> => {
  const exists = await prisma.product.findFirst({
    where: {
      sellerId: userId,
      slug: productSlug,
    },
  })

  return exists !== null
}
