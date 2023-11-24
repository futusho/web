import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { buildSellerShowcaseURL } from '@/lib/routes'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import type { Prisma } from '@prisma/client'
import type { TypeOf } from 'zod'

export class SellerDoesNotExist extends ClientError {
  constructor() {
    super('Seller does not exist')
  }
}

export class ProductDoesNotExist extends ClientError {
  constructor() {
    super('Product does not exist')
  }
}

export const RequestSchema = z
  .object({
    sellerUsername: z.string().trim().min(1).toLowerCase(),
    productSlug: z.string().trim().min(1).toLowerCase(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

interface Seller {
  id: string
  username: string
  displayName: string
  avatar: string | null
}

interface Product {
  id: string
  title: string
  description: string
  priceFormatted: string
  networkTitle: string
  covers: string[]
  attributes: ProductAttribute[]
}

interface ProductAttribute {
  key: string
  value: string
}

interface ProductDetails {
  id: string
  title: string
  description: string | null
  priceFormatted: string
  networkTitle: string
  covers: string[]
  attributes: ProductAttribute[]
}

interface SellerDetails {
  displayName: string
  profileURL: string
  avatarURL: string
}

export interface Result {
  product: ProductDetails
  seller: SellerDetails
}

export const getSellerProductShowcase = async (
  request: Request
): Promise<Result> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const seller = await getSellerByUsername(validationResult.data.sellerUsername)

  const product = await getSellerProductBySlug(
    seller.id,
    validationResult.data.productSlug
  )

  return {
    product: {
      id: product.id,
      title: product.title,
      description: product.description,
      priceFormatted: product.priceFormatted,
      networkTitle: product.networkTitle,
      covers: product.covers,
      attributes: product.attributes,
    },
    seller: {
      displayName: seller.displayName,
      profileURL: buildSellerShowcaseURL(seller.username),
      avatarURL: seller.avatar ?? '/avatar-placeholder.png',
    },
  }
}

const getSellerByUsername = async (username: string): Promise<Seller> => {
  const seller = await prisma.user.findFirst({
    where: {
      username: username,
    },
  })

  if (!seller) {
    throw new SellerDoesNotExist()
  }

  return {
    id: seller.id,
    username: seller.username,
    displayName: seller.name || seller.username,
    avatar: seller.image,
  }
}

const getSellerProductBySlug = async (
  sellerId: string,
  productSlug: string
): Promise<Product> => {
  const product = await prisma.product.findFirst({
    where: {
      sellerId: sellerId,
      slug: productSlug,
      publishedAt: {
        not: null,
      },
      sellerMarketplaceToken: {
        sellerMarketplace: {
          confirmedAt: {
            not: null,
          },
        },
      },
    },
    include: {
      productImages: {
        select: {
          url: true,
        },
        where: {
          type: 'cover',
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      sellerMarketplaceToken: {
        include: {
          sellerMarketplace: {
            include: {
              network: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!product) {
    throw new ProductDoesNotExist()
  }

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
    title: product.title,
    description: product.description ?? '',
    priceFormatted: product.priceFormatted,
    networkTitle:
      product.sellerMarketplaceToken.sellerMarketplace.network.title,
    covers: product.productImages.map((cover) => cover.url),
    attributes: attributes,
  }
}
