import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getProductsByCategoryForMarketplace,
  ProductCategoryDoesNotExist,
} from '@/useCases/getProductsByCategoryForMarketplace'
import { cleanDatabase } from '../helpers'
import type { Product, ProductCategory } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getProductsByCategoryForMarketplace', () => {
  const request = {
    categorySlug: 'slug',
  }

  describe('when categorySlug is an empty string', () => {
    expect.assertions(2)

    it('returns error', async () => {
      try {
        const result = await getProductsByCategoryForMarketplace({
          ...request,
          categorySlug: ' ',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'categorySlug: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when product category does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getProductsByCategoryForMarketplace({
          ...request,
          categorySlug: 'does-not-exist',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductCategoryDoesNotExist)
        expect((e as ProductCategoryDoesNotExist).message).toEqual(
          'Product category does not exist'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let productCategory1: ProductCategory,
      product1: Product,
      product2: Product,
      product3: Product

    beforeEach(async () => {
      const user1 = await prisma.user.create({
        data: {
          username: 'user1',
          name: 'Here is my name',
        },
      })

      const user2 = await prisma.user.create({
        data: {
          username: 'user2',
        },
      })

      const user3 = await prisma.user.create({
        data: {
          username: 'user3',
        },
      })

      const network = await prisma.network.create({
        data: {
          title: 'Network',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })

      const networkMarketplaceCoin =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })

      const networkMarketplaceToken =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            smartContractAddress: '0xCONTRACT',
            symbol: 'TOKEN',
          },
        })

      const user1Marketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user1.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const user1MarketplaceCoin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      const user1MarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace.id,
          networkMarketplaceTokenId: networkMarketplaceToken.id,
        },
      })

      const user2Marketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user2.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const user2MarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user2Marketplace.id,
          networkMarketplaceTokenId: networkMarketplaceToken.id,
        },
      })

      const user3Marketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user3.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const user3MarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user3Marketplace.id,
          networkMarketplaceTokenId: networkMarketplaceToken.id,
        },
      })

      productCategory1 = await prisma.productCategory.create({
        data: {
          slug: 'category1',
          title: 'Category 1',
          description: 'Description 1',
        },
      })

      const productCategory2 = await prisma.productCategory.create({
        data: {
          slug: 'category2',
          title: 'Category 2',
          description: 'Description 2',
        },
      })

      product1 = await prisma.product.create({
        data: {
          sellerId: user1.id,
          sellerMarketplaceTokenId: user1MarketplaceCoin.id,
          categoryId: productCategory1.id,
          slug: 'product-slug',
          title: 'Product Title 1',
          description: 'Product Description 1',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.create({
        data: {
          productId: product1.id,
          type: 'cover',
          url: '/cover.png',
        },
      })

      product2 = await prisma.product.create({
        data: {
          sellerId: user1.id,
          sellerMarketplaceTokenId: user1MarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug-2',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '0.000000000009391929',
          priceDecimals: 18,
          priceFormatted: '1232.00000000009391929 TOKEN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.create({
        data: {
          productId: product2.id,
          type: 'thumbnail',
          url: '/product2-thumbnail.png',
        },
      })

      product3 = await prisma.product.create({
        data: {
          sellerId: user2.id,
          sellerMarketplaceTokenId: user2MarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug',
          title: 'Product Title 3',
          description: 'Product Description 3',
          content: '',
          price: '1.99',
          priceDecimals: 18,
          priceFormatted: '1.99 TOKEN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.createMany({
        data: [
          {
            productId: product3.id,
            type: 'thumbnail',
            url: 'http://localhost/product3-thumbnail1.png',
          },
          // NOTE: This thumbnail will be skipped because of ordering
          {
            productId: product3.id,
            type: 'thumbnail',
            url: 'http://localhost/product3-thumbnail2.png',
          },
          {
            productId: product3.id,
            type: 'cover',
            url: '/product3-cover.png',
          },
        ],
      })

      // NOTE: This product will be skipped because of another category
      await prisma.product.create({
        data: {
          sellerId: user1.id,
          sellerMarketplaceTokenId: user1MarketplaceCoin.id,
          categoryId: productCategory2.id,
          slug: 'product-slug-4',
          title: 'Product Title 4',
          description: 'Product Description 4',
          content: '',
          price: '1.1',
          priceDecimals: 18,
          priceFormatted: '1.1 COIN',
          publishedAt: new Date(),
        },
      })

      // NOTE: This product will be skipped because its unpublished
      await prisma.product.create({
        data: {
          sellerId: user1.id,
          sellerMarketplaceTokenId: user1MarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug-5',
          title: 'Product Title 5',
          description: 'Product Description 5',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 TOKEN',
        },
      })

      // NOTE: This product will be skipped because its seller marketplace is unpublished
      await prisma.product.create({
        data: {
          sellerId: user3.id,
          sellerMarketplaceTokenId: user3MarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug-6',
          title: 'Product Title 6',
          description: 'Product Description 6',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 TOKEN',
          publishedAt: new Date(),
        },
      })
    })

    it('returns product category with products', async () => {
      const result = await getProductsByCategoryForMarketplace({
        categorySlug: 'CATEGORY1',
      })

      expect(result).toBeDefined()

      expect(result.category).toEqual({
        id: productCategory1.id,
        slug: 'category1',
        title: 'Category 1',
        description: 'Description 1',
      })

      expect(result.products).toHaveLength(3)

      const products = result.products

      expect(products[0]).toEqual({
        id: product3.id,
        title: 'Product Title 3',
        thumbnailImageURL: 'http://localhost/product3-thumbnail1.png',
        priceFormatted: '1.99 TOKEN',
        productPageURL: '/u/user2/product-slug',
        sellerAvatarURL: '/avatar-placeholder.png',
        sellerDisplayName: 'user2',
      })

      expect(products[1]).toEqual({
        id: product2.id,
        title: 'Product Title 2',
        thumbnailImageURL: '/product2-thumbnail.png',
        priceFormatted: '1232.00000000009391929 TOKEN',
        productPageURL: '/u/user1/product-slug-2',
        sellerAvatarURL: '/avatar-placeholder.png',
        sellerDisplayName: 'Here is my name',
      })

      expect(products[2]).toEqual({
        id: product1.id,
        title: 'Product Title 1',
        thumbnailImageURL: null,
        priceFormatted: '1233.09391929 COIN',
        productPageURL: '/u/user1/product-slug',
        sellerAvatarURL: '/avatar-placeholder.png',
        sellerDisplayName: 'Here is my name',
      })
    })
  })
})
