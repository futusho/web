import { prisma } from '@/lib/prisma'
import { getProductCategoriesForMarketplace } from '@/useCases/getProductCategoriesForMarketplace'
import { cleanDatabase } from '../helpers'
import type { ProductCategory } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getProductCategoriesForMarketplace', () => {
  describe('when everything is good', () => {
    let productCategory1: ProductCategory,
      productCategory2: ProductCategory,
      productCategory3: ProductCategory

    beforeEach(async () => {
      productCategory1 = await prisma.productCategory.create({
        data: {
          slug: 'product-category-1',
          title: 'Product Category 1',
          description: 'Description 1',
        },
      })

      productCategory2 = await prisma.productCategory.create({
        data: {
          slug: 'product-category-2',
          title: 'Product Category 2',
          description: 'Description 2',
        },
      })

      productCategory3 = await prisma.productCategory.create({
        data: {
          slug: 'another-category',
          title: 'One More Product Category',
          description: 'Description 3',
        },
      })
    })

    it('returns categories', async () => {
      const productCategories = await getProductCategoriesForMarketplace()

      expect(productCategories).toHaveLength(3)

      expect(productCategories[0]).toEqual({
        id: productCategory3.id,
        title: 'One More Product Category',
        description: 'Description 3',
        productCategoryURL: '/products/another-category',
      })

      expect(productCategories[1]).toEqual({
        id: productCategory1.id,
        title: 'Product Category 1',
        description: 'Description 1',
        productCategoryURL: '/products/product-category-1',
      })

      expect(productCategories[2]).toEqual({
        id: productCategory2.id,
        title: 'Product Category 2',
        description: 'Description 2',
        productCategoryURL: '/products/product-category-2',
      })
    })
  })
})
