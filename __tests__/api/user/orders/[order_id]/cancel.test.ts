import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/orders/[order_id]/cancel'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequestWithQuery,
  parseJSON,
} from '../../../../helpers'
import type {
  Product,
  SellerMarketplace,
  ProductOrder,
  SellerMarketplaceToken,
  Network,
} from '@prisma/client'

const ENDPOINT = '/api/user/orders/[order_id]/cancel'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`POST ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockPOSTRequestWithQuery({ order_id: 'id' }, {}, '')

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)

      const json = parseJSON(res)

      expect(json).toEqual({
        success: false,
        message: 'Authorization required',
      })
    })
  })

  describe('when request is authorized', () => {
    let sessionToken: string, userId: string

    beforeEach(async () => {
      const { sessionToken: _sessionToken, userId: _userId } =
        await createUserWithSession()

      sessionToken = _sessionToken
      userId = _userId
    })

    describe('when order does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: uuidv4(),
          },
          {},
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order does not exist',
        })
      })
    })

    describe('when order is confirmed', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
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
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        const userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
          {
            data: {
              sellerMarketplaceId: userMarketplace.id,
              networkMarketplaceTokenId: networkMarketplaceCoin.id,
            },
          }
        )

        const productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })

        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: userId,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: userProductOrder.id,
          },
          {},
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order cannot be cancelled',
        })
      })
    })

    describe('when order is cancelled', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
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
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        const userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
          {
            data: {
              sellerMarketplaceId: userMarketplace.id,
              networkMarketplaceTokenId: networkMarketplaceCoin.id,
            },
          }
        )

        const productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })

        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: userId,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
            cancelledAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: userProductOrder.id,
          },
          {},
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order cannot be cancelled',
        })
      })
    })

    describe('when order is refunded', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
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
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        const userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
          {
            data: {
              sellerMarketplaceId: userMarketplace.id,
              networkMarketplaceTokenId: networkMarketplaceCoin.id,
            },
          }
        )

        const productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })

        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: userId,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
            refundedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: userProductOrder.id,
          },
          {},
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order cannot be cancelled',
        })
      })
    })

    describe('when order is pending and has unprocessed transaction', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
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
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        const userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
          {
            data: {
              sellerMarketplaceId: userMarketplace.id,
              networkMarketplaceTokenId: networkMarketplaceCoin.id,
            },
          }
        )

        const productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })

        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: userId,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
            refundedAt: new Date(),
          },
        })

        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            hash: '0xHASH',
            networkId: network.id,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: userProductOrder.id,
          },
          {},
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order cannot be cancelled',
        })
      })
    })

    describe('when everything is great', () => {
      let network: Network,
        product: Product,
        userMarketplace: SellerMarketplace,
        userMarketplaceToken: SellerMarketplaceToken

      beforeEach(async () => {
        network = await prisma.network.create({
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

        userMarketplace = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
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

        product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 42.099919,
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })
      })

      describe('when order is a draft', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: 42.099919,
              priceFormatted: '42.099919 COIN',
              priceDecimals: 18,
              sellerWalletAddress: '0xDEADBEEF',
            },
          })
        })

        it('cancels order', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              order_id: userProductOrder.id,
            },
            {},
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: { success: true },
          })

          const cancelledUserOrder = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
          })

          if (!cancelledUserOrder) {
            throw new Error('Product order does not exist')
          }

          expect(cancelledUserOrder.buyerId).toEqual(userId)
          expect(cancelledUserOrder.pendingAt).toBeNull()
          expect(cancelledUserOrder.confirmedAt).toBeNull()
          expect(cancelledUserOrder.cancelledAt).not.toBeNull()
          expect(cancelledUserOrder.refundedAt).toBeNull()
        })
      })

      describe('when order is pending and has failed transaction', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: 42.099919,
              priceFormatted: '42.099919 COIN',
              priceDecimals: 18,
              sellerWalletAddress: '0xDEADBEEF',
              pendingAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              hash: '0xHASH',
              networkId: network.id,
              failedAt: new Date(),
            },
          })
        })

        it('cancels order', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              order_id: userProductOrder.id,
            },
            {},
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: { success: true },
          })

          const cancelledUserOrder = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
          })

          if (!cancelledUserOrder) {
            throw new Error('Product order does not exist')
          }

          expect(cancelledUserOrder.buyerId).toEqual(userId)
          expect(cancelledUserOrder.pendingAt).toEqual(
            userProductOrder.pendingAt
          )
          expect(cancelledUserOrder.confirmedAt).toBeNull()
          expect(cancelledUserOrder.cancelledAt).not.toBeNull()
          expect(cancelledUserOrder.refundedAt).toBeNull()
        })
      })
    })
  })
})
