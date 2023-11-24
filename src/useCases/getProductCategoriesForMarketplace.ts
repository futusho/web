import { prisma } from '@/lib/prisma'

export interface ProductCategory {
  id: string
  title: string
  description: string
  productCategoryURL: string
}

export type Result = ProductCategory[]

// TODO: Rename to getMarketplaceProductCategories or move to marketplaces subdirectory
export const getProductCategoriesForMarketplace = async (): Promise<Result> => {
  const productCategories = await prisma.productCategory.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
    },
    orderBy: {
      title: 'asc',
    },
  })

  return productCategories.map((productCategory) => ({
    id: productCategory.id,
    productCategoryURL: `/products/${productCategory.slug}`,
    title: productCategory.title,
    description: productCategory.description,
  }))
}
