import { prisma } from '@/lib/prisma'
import { getProductCategories } from '@/useCases/getProductCategories'
import { cleanDatabase } from '../helpers'
import type { ProductCategory } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getProductCategories', () => {
  describe('when everything is good', () => {
    let productCategory1: ProductCategory,
      productCategory2: ProductCategory,
      productCategory3: ProductCategory

    beforeEach(async () => {
      productCategory1 = await prisma.productCategory.create({
        data: {
          slug: 'product-category-1',
          title: 'Product Category 1',
          description: 'Description',
        },
      })

      productCategory2 = await prisma.productCategory.create({
        data: {
          slug: 'product-category-2',
          title: 'Product Category 2',
          description: 'Description',
        },
      })

      productCategory3 = await prisma.productCategory.create({
        data: {
          slug: 'another-category',
          title: 'One More Product Category',
          description: 'Description',
        },
      })
    })

    it('returns categories', async () => {
      const productCategories = await getProductCategories()

      expect(productCategories).toHaveLength(3)

      expect(productCategories[0]).toEqual({
        id: productCategory3.id,
        title: 'One More Product Category',
      })

      expect(productCategories[1]).toEqual({
        id: productCategory1.id,
        title: 'Product Category 1',
      })

      expect(productCategories[2]).toEqual({
        id: productCategory2.id,
        title: 'Product Category 2',
      })
    })
  })
})
