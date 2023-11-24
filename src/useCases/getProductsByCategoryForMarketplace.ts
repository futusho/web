import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { buildProductPageURL } from '@/lib/routes'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import type { TypeOf } from 'zod'

export class ProductCategoryDoesNotExist extends ClientError {
  constructor() {
    super('Product category does not exist')
  }
}

export const RequestSchema = z
  .object({
    categorySlug: z.string().trim().min(1).toLowerCase(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface ProductCategory {
  id: string
  slug: string
  title: string
  description: string
}

export interface Product {
  id: string
  title: string
  thumbnailImageURL: string | null
  priceFormatted: string
  productPageURL: string
  sellerDisplayName: string
  sellerAvatarURL: string
}

export interface Result {
  category: ProductCategory
  products: Product[]
}

export const getProductsByCategoryForMarketplace = async (
  request: Request
): Promise<Result> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const productCategory = await getCategoryBySlug(
    validationResult.data.categorySlug
  )

  const products = await getProductsByCategoryId(productCategory.id)

  return {
    category: productCategory,
    products: products,
  }
}

const getCategoryBySlug = async (slug: string): Promise<ProductCategory> => {
  const productCategory = await prisma.productCategory.findFirst({
    where: {
      slug: slug,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
    },
  })

  if (!productCategory) {
    throw new ProductCategoryDoesNotExist()
  }

  return {
    id: productCategory.id,
    slug: productCategory.slug,
    title: productCategory.title,
    description: productCategory.description,
  }
}

const getProductsByCategoryId = async (
  categoryId: string
): Promise<Product[]> => {
  const products = await prisma.product.findMany({
    where: {
      categoryId: categoryId,
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
      seller: {
        select: {
          username: true,
          name: true,
          image: true,
        },
      },
      productImages: {
        where: {
          type: 'thumbnail',
        },
        select: {
          url: true,
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
    title: product.title,
    priceFormatted: product.priceFormatted,
    // TODO: When product does not have thumbnail, return default image
    thumbnailImageURL:
      product.productImages.length > 0 ? product.productImages[0].url : null,
    productPageURL: buildProductPageURL(product.seller.username, product.slug),
    sellerAvatarURL: product.seller.image ?? '/avatar-placeholder.png',
    sellerDisplayName: product.seller.name ?? product.seller.username,
  }))
}
