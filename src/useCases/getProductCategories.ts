import { prisma } from '@/lib/prisma'

export interface ProductCategory {
  id: string
  title: string
}

export type Result = ProductCategory[]

// TODO: Add category thumbnail images
// NOTE: Used on products creation & updation
export const getProductCategories = async (): Promise<Result> => {
  const productCategories = await prisma.productCategory.findMany({
    orderBy: {
      title: 'asc',
    },
  })

  return productCategories.map((productCategory) => ({
    id: productCategory.id,
    title: productCategory.title,
  }))
}
