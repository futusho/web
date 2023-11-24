import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getSellerShowcase,
  SellerDoesNotExist,
} from '@/useCases/getSellerShowcase'
import { cleanDatabase } from '../helpers'
import type { Product, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getSellerShowcase', () => {
  const request = {
    sellerUsername: 'username',
  }

  describe('when username is an empty string', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getSellerShowcase({
          ...request,
          sellerUsername: ' ',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'sellerUsername: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when seller does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getSellerShowcase({
          ...request,
          sellerUsername: 'does-not-exist',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(SellerDoesNotExist)
        expect((e as SellerDoesNotExist).message).toEqual(
          'Seller does not exist'
        )
      }
    })
  })

  describe('when seller account is not activated', () => {
    it.todo('returns error')
  })

  describe('when seller marketplace is not confirmed', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          username: 'username',
          name: 'My Name',
          image: 'http://localhost/avatar.png',
          bio: 'My BIO',
        },
      })

      const anotherUser = await prisma.user.create({
        data: {},
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

      const userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      const anotherUserMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: anotherUser.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const anotherUserMarketplaceToken =
        await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: anotherUserMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })

      const productCategory1 = await prisma.productCategory.create({
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

      const userProduct1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
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
          productId: userProduct1.id,
          type: 'cover',
          url: '/product1-cover.png',
        },
      })

      const userProduct2 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory2.id,
          slug: 'product-slug-2',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '0.000000000009391929',
          priceDecimals: 18,
          priceFormatted: '1232.00000000009391929 COIN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.create({
        data: {
          productId: userProduct2.id,
          type: 'thumbnail',
          url: '/product2-thumbnail.png',
        },
      })

      const userProduct3 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory2.id,
          slug: 'product-slug-3',
          title: 'Product Title 3',
          description: 'Product Description 3',
          content: '',
          price: '1.1',
          priceDecimals: 18,
          priceFormatted: '1.1 COIN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.createMany({
        data: [
          {
            productId: userProduct3.id,
            type: 'thumbnail',
            url: 'http://localhost/product3-thumbnail1.png',
          },
          // This will be skipped because of ordering
          {
            productId: userProduct3.id,
            type: 'thumbnail',
            url: '/product3-thumbnail2.png',
          },
          // This will be skipped because of type
          {
            productId: userProduct3.id,
            type: 'cover',
            url: '/product3-cover.png',
          },
        ],
      })

      // NOTE: This product will be skipped because unpublished
      await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug-4',
          title: 'Product Title 4',
          description: 'Product Description 4',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
        },
      })

      // NOTE: This product will be skipped because of another user
      await prisma.product.create({
        data: {
          sellerId: anotherUser.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug',
          title: 'Product Title 5',
          description: 'Product Description 5',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
          publishedAt: new Date(),
        },
      })
    })

    it('returns seller showcase without products', async () => {
      const result = await getSellerShowcase({
        sellerUsername: ' USERNAME ',
      })

      expect(result).toBeDefined()

      expect(result.seller).toEqual({
        displayName: 'My Name',
        avatarImageURL: 'http://localhost/avatar.png',
        coverImageURL: null,
        bio: 'My BIO',
        profileURL: '/u/username',
      })

      expect(result.products).toHaveLength(0)
    })
  })

  describe('when everything is good', () => {
    let user: User,
      userProduct1: Product,
      userProduct2: Product,
      userProduct3: Product

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          username: 'username',
          name: 'My Name',
          image: 'http://localhost/avatar.png',
          bio: 'My BIO',
        },
      })

      const anotherUser = await prisma.user.create({
        data: {},
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

      const userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      const anotherUserMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: anotherUser.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const anotherUserMarketplaceToken =
        await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: anotherUserMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })

      const productCategory1 = await prisma.productCategory.create({
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

      userProduct1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
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
          productId: userProduct1.id,
          type: 'cover',
          url: '/product1-cover.png',
        },
      })

      userProduct2 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory2.id,
          slug: 'product-slug-2',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '0.000000000009391929',
          priceDecimals: 18,
          priceFormatted: '1232.00000000009391929 COIN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.create({
        data: {
          productId: userProduct2.id,
          type: 'thumbnail',
          url: '/product2-thumbnail.png',
        },
      })

      userProduct3 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory2.id,
          slug: 'product-slug-3',
          title: 'Product Title 3',
          description: 'Product Description 3',
          content: '',
          price: '1.1',
          priceDecimals: 18,
          priceFormatted: '1.1 COIN',
          publishedAt: new Date(),
        },
      })

      await prisma.productImage.createMany({
        data: [
          {
            productId: userProduct3.id,
            type: 'thumbnail',
            url: 'http://localhost/product3-thumbnail1.png',
          },
          // This will be skipped because of ordering
          {
            productId: userProduct3.id,
            type: 'thumbnail',
            url: '/product3-thumbnail2.png',
          },
          // This will be skipped because of type
          {
            productId: userProduct3.id,
            type: 'cover',
            url: '/product3-cover.png',
          },
        ],
      })

      // NOTE: This product will be skipped because unpublished
      await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug-4',
          title: 'Product Title 4',
          description: 'Product Description 4',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
        },
      })

      // NOTE: This product will be skipped because of another user
      await prisma.product.create({
        data: {
          sellerId: anotherUser.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-slug',
          title: 'Product Title 5',
          description: 'Product Description 5',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
          publishedAt: new Date(),
        },
      })
    })

    it('returns seller showcase', async () => {
      const result = await getSellerShowcase({
        sellerUsername: ' USERNAME ',
      })

      expect(result).toBeDefined()

      expect(result.seller).toEqual({
        displayName: 'My Name',
        avatarImageURL: 'http://localhost/avatar.png',
        coverImageURL: null,
        bio: 'My BIO',
        profileURL: '/u/username',
      })

      expect(result.products).toHaveLength(3)

      const products = result.products

      expect(products[0]).toEqual({
        id: userProduct3.id,
        title: 'Product Title 3',
        productPageURL: '/u/username/product-slug-3',
        priceFormatted: '1.1 COIN',
        thumbnailImageURL: 'http://localhost/product3-thumbnail1.png',
      })

      expect(products[1]).toEqual({
        id: userProduct2.id,
        title: 'Product Title 2',
        productPageURL: '/u/username/product-slug-2',
        priceFormatted: '1232.00000000009391929 COIN',
        thumbnailImageURL: '/product2-thumbnail.png',
      })

      expect(products[2]).toEqual({
        id: userProduct1.id,
        title: 'Product Title 1',
        productPageURL: '/u/username/product-slug',
        priceFormatted: '1233.09391929 COIN',
        thumbnailImageURL: null,
      })
    })
  })
})
