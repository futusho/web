import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getRecentProductOrderForBuyer,
  ProductOrderDoesNotExist,
  UserDoesNotExist,
} from '@/useCases/getRecentProductOrderForBuyer'
import { cleanDatabase } from '../helpers'
import type { Product, ProductOrder, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getRecentProductOrderForBuyer', () => {
  const request = {
    userId: uuidv4(),
    sellerProductId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentProductOrderForBuyer({
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

  describe('when sellerProductId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentProductOrderForBuyer({
          ...request,
          sellerProductId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'sellerProductId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentProductOrderForBuyer({
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

  describe('when seller product does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentProductOrderForBuyer({
          ...request,
          userId: user.id,
          sellerProductId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductOrderDoesNotExist)
        expect((e as ProductOrderDoesNotExist).message).toEqual(
          'Product order does not exist'
        )
      }
    })
  })

  describe('when order exists', () => {
    let user: User, sellerProduct: Product, userProductOrder: ProductOrder

    beforeEach(async () => {
      user = await prisma.user.create({
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
          confirmedAt: new Date(),
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xWALLET',
        },
      })

      const userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      sellerProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
          publishedAt: new Date(),
        },
      })

      // NOTE: This order will be skipped because of ordering
      await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: sellerProduct.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          sellerWalletAddress: '',
          price: '1234.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1234.09391929 COIN',
        },
      })

      userProductOrder = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: sellerProduct.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          sellerWalletAddress: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
        },
      })
    })

    it('returns recent product order', async () => {
      const recentProductOrder = await getRecentProductOrderForBuyer({
        userId: user.id,
        sellerProductId: sellerProduct.id,
      })

      expect(recentProductOrder.id).toEqual(userProductOrder.id)
      expect(recentProductOrder.userId).toEqual(user.id)
      expect(recentProductOrder.productId).toEqual(sellerProduct.id)
      expect(recentProductOrder.priceFormatted).toEqual('1233.09391929 COIN')
    })
  })
})
