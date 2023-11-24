import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import { isUserExists } from './helpers'
import type { Prisma } from '@prisma/client'
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

interface ProductImage {
  id: string
  url: string
}

interface ProductAttribute {
  key: string
  value: string
}

export interface Result {
  id: string
  userMarketplaceTokenId: string
  productCategoryId: string
  slug: string
  title: string
  description: string
  content: string
  price: string
  coverImages: ProductImage[]
  thumbnailImages: ProductImage[]
  attributes: ProductAttribute[]
}

// NOTE: Used in product edit page and product updation API
export const getUserProductDetailsForEdit = async (
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
      productImages: {
        select: {
          id: true,
          type: true,
          url: true,
        },
      },
    },
  })

  if (!product) {
    throw new ProductDoesNotExist()
  }

  // TODO: Add tests
  const coverImages = product.productImages
    .filter((image) => image.type === 'cover')
    .map((image) => ({
      id: image.id,
      url: image.url,
    }))

  // TODO: Add tests
  const thumbnailImages = product.productImages
    .filter((image) => image.type === 'thumbnail')
    .map((image) => ({
      id: image.id,
      url: image.url,
    }))

  const attributes: ProductAttribute[] = []

  if (
    product.attributes &&
    typeof product.attributes === 'object' &&
    Array.isArray(product.attributes)
  ) {
    const productAttributes = product.attributes as Prisma.JsonArray

    productAttributes.forEach((productAttribute) => {
      const attribute = productAttribute as unknown as ProductAttribute

      attributes.push({
        key: attribute.key,
        value: attribute.value,
      })
    })
  }

  return {
    id: product.id,
    userMarketplaceTokenId: product.sellerMarketplaceTokenId,
    productCategoryId: product.categoryId,
    slug: product.slug,
    title: product.title,
    description: product.description ?? '',
    content: product.content ?? '',
    price: product.price.toString(),
    coverImages: coverImages,
    thumbnailImages: thumbnailImages,
    attributes: attributes,
  }
}
