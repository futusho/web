import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import { getUserProducts, UserDoesNotExist } from '@/useCases/getUserProducts'
import { cleanDatabase } from '../helpers'
import type { Product, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserProducts', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProducts({
          ...request,
          userId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProducts({
          ...request,
          userId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserDoesNotExist)
        expect((e as UserDoesNotExist).message).toEqual('User does not exist')
      }
    })
  })

  describe('when everything is good', () => {
    let user: User, userProduct1: Product, userProduct2: Product

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
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

      userProduct1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-title',
          title: 'Product Title 1',
          description: 'Product Description 1',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          publishedAt: new Date(),
        },
      })

      userProduct2 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory2.id,
          slug: 'product-title-2',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '0.000000000009391929',
          priceDecimals: 18,
          priceFormatted: '1232.00000000009391929 COIN',
        },
      })

      // NOTE: This product will be skipped
      await prisma.product.create({
        data: {
          sellerId: anotherUser.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceToken.id,
          categoryId: productCategory1.id,
          slug: 'product-title-3',
          title: 'Product Title 3',
          description: 'Product Description 3',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
        },
      })
    })

    it('returns products', async () => {
      const userProducts = await getUserProducts({
        userId: user.id,
      })

      expect(userProducts).toHaveLength(2)

      expect(userProducts[0]).toEqual({
        id: userProduct2.id,
        title: 'Product Title 2',
        categoryTitle: 'Category 2',
        priceFormatted: '1232.00000000009391929 COIN',
        status: 'draft',
      })

      expect(userProducts[1]).toEqual({
        id: userProduct1.id,
        title: 'Product Title 1',
        categoryTitle: 'Category 1',
        priceFormatted: '1233.09391929 COIN',
        status: 'published',
      })
    })
  })
})
