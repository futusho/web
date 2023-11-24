import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { buildSellerShowcaseURL, buildProductPageURL } from '@/lib/routes'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import type { TypeOf } from 'zod'

export class SellerDoesNotExist extends ClientError {
  constructor() {
    super('Seller does not exist')
  }
}

export const RequestSchema = z
  .object({
    sellerUsername: z.string().trim().min(1).toLowerCase(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

interface Seller {
  id: string
  displayName: string
  avatarImageURL: string | null
  coverImageURL: string | null
  bio: string | null
}

interface Product {
  id: string
  slug: string
  title: string
  priceFormatted: string
  thumbnailImageURL: string | null
}

interface SellerCard {
  displayName: string
  avatarImageURL: string | null
  coverImageURL: string | null
  bio: string | null
  profileURL: string
}

interface ProductCard {
  id: string
  title: string
  thumbnailImageURL: string | null
  priceFormatted: string
  productPageURL: string
}

export interface Result {
  seller: SellerCard
  products: ProductCard[]
}

export const getSellerShowcase = async (request: Request): Promise<Result> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const seller = await getSellerByUsername(validationResult.data.sellerUsername)
  const products = await getSellerProducts(seller.id)

  return {
    seller: {
      displayName: seller.displayName,
      avatarImageURL: seller.avatarImageURL ?? null,
      coverImageURL: seller.coverImageURL ?? null,
      bio: seller.bio,
      profileURL: buildSellerShowcaseURL(validationResult.data.sellerUsername),
    },
    products: products.map((product) => ({
      id: product.id,
      productPageURL: buildProductPageURL(
        validationResult.data.sellerUsername,
        product.slug
      ),
      title: product.title,
      thumbnailImageURL: product.thumbnailImageURL,
      priceFormatted: product.priceFormatted,
    })),
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
    displayName: seller.name ?? seller.username,
    bio: seller.bio,
    avatarImageURL: seller.image,
    // FIXME: Add cover image URL to user profile
    coverImageURL: null,
  }
}

const getSellerProducts = async (sellerId: string): Promise<Product[]> => {
  const products = await prisma.product.findMany({
    where: {
      sellerId: sellerId,
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
          type: 'thumbnail',
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    priceFormatted: product.priceFormatted,
    thumbnailImageURL:
      product.productImages.length > 0 ? product.productImages[0].url : null,
  }))
}
