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

export class ProductDoesNotExist extends ClientError {
  constructor() {
    super('Product does not exist')
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

export class ProductSlugIsAlreadyTaken extends ClientError {
  constructor() {
    super('Product slug is already taken')
  }
}

export const RequestSchema = z
  .object({
    productId: z.string().uuid(),
    userId: z.string().uuid(),
    userMarketplaceTokenId: z.string().uuid(),
    productCategoryId: z.string().uuid(),
    productSlug: z.string().trim().min(1).toLowerCase(),
    productTitle: z.string().trim().min(1),
    productDescription: z.string().trim(),
    productContent: z.string().trim(),
    // Here is we expect to have stringified human-readable price, like '1234.567890'
    productPrice: z.string().trim().min(1),
    coverImageURLsToAdd: z.array(z.string().url()).optional(),
    coverImageIdsToDelete: z.array(z.string().uuid()).optional(),
    thumbnailImageURLsToAdd: z.array(z.string().url()).optional(),
    thumbnailImageIdsToDelete: z.array(z.string().uuid()).optional(),
    attributes: z.array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string().trim(),
      })
    ),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const updateUserProduct = async (request: Request): Promise<void> => {
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

  await ensureUserProductExists(
    validationResult.data.userId,
    validationResult.data.productId
  )

  // TODO: Check if there are no orders yet. Otherwise throw an error
  // because we don't allow to update tokens with existing orders

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

  const slug = toSlug(validationResult.data.productSlug)

  await ensureUserProductSlugDoesNotExist(
    validationResult.data.userId,
    validationResult.data.productId,
    slug
  )

  // TODO: Add tests to add covers and thumbnails
  // TODO: Add tests to delete covers and thumbnails

  await prisma.product.update({
    where: {
      id: validationResult.data.productId,
    },
    data: {
      sellerMarketplaceTokenId: validationResult.data.userMarketplaceTokenId,
      categoryId: validationResult.data.productCategoryId,
      slug: slug,
      title: validationResult.data.productTitle,
      description: validationResult.data.productDescription,
      content: validationResult.data.productContent,
      price: price,
      priceDecimals: decimals,
      priceFormatted: price + ' ' + symbol,
      attributes: validationResult.data.attributes,
      publishedAt:
        validationResult.data.productContent.length > 0 ? new Date() : null,
      productImages: {
        deleteMany: (validationResult.data.coverImageIdsToDelete ?? [])
          .concat(validationResult.data.thumbnailImageIdsToDelete ?? [])
          .map((id) => ({
            id: id,
          })),
        createMany: {
          data: (validationResult.data.coverImageURLsToAdd ?? [])
            .map((url) => ({
              type: 'cover',
              url: url,
            }))
            .concat(
              (validationResult.data.thumbnailImageURLsToAdd ?? []).map(
                (url) => ({
                  type: 'thumbnail',
                  url: url,
                })
              )
            ),
        },
      },
    },
  })
}

const ensureUserProductExists = async (
  userId: string,
  userProductId: string
): Promise<void> => {
  const exists = await prisma.product.findFirst({
    where: {
      id: userProductId,
      sellerId: userId,
    },
  })

  if (!exists) {
    throw new ProductDoesNotExist()
  }
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

const ensureUserProductSlugDoesNotExist = async (
  userId: string,
  userProductId: string,
  productSlug: string
): Promise<void> => {
  const exists = await prisma.product.findFirst({
    where: {
      id: {
        not: userProductId,
      },
      sellerId: userId,
      slug: productSlug,
    },
  })

  if (exists) {
    throw new ProductSlugIsAlreadyTaken()
  }
}
