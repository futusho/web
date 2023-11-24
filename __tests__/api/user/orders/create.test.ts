import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/orders'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequest,
  parseJSON,
} from '../../../helpers'
import type {
  Product,
  SellerMarketplace,
  SellerMarketplaceToken,
} from '@prisma/client'

const ENDPOINT = '/api/user/orders'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`POST ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockPOSTRequest({}, '')

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

    describe('request validations', () => {
      describe('when product_id is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest({}, sessionToken)

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['product_id: Required'],
          })
        })
      })
    })

    describe('when product_id is not a valid uuid', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            product_id: 'id',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['productId: Invalid uuid'],
        })
      })
    })

    describe('when product does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            product_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Product does not exist',
        })
      })
    })

    describe('when product is not published', () => {
      let product: Product

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
            smartContractAddress: '',
            ownerWalletAddress: '',
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

        product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: '42.099919',
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            product_id: product.id,
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Product does not exist',
        })
      })
    })

    describe('when these is unpaid order for such a product', () => {
      let product: Product

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
            confirmedAt: new Date(),
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

        product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            content: 'Product Content',
            price: '42.099919',
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            publishedAt: new Date(),
          },
        })

        await prisma.productOrder.create({
          data: {
            buyerId: userId,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '',
            price: '42.099919',
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            product_id: product.id,
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Unpaid order exists. Please pay or cancel the order',
        })
      })
    })

    describe('when everything is great', () => {
      let product: Product,
        userMarketplace: SellerMarketplace,
        userMarketplaceToken: SellerMarketplaceToken

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

        userMarketplace = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
            confirmedAt: new Date(),
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
            content: 'Product Content',
            price: '88819.099919',
            priceDecimals: 18,
            priceFormatted: '88819.099919 COIN',
            publishedAt: new Date(),
          },
        })
      })

      describe('when there are no orders', () => {
        it('creates an unpaid order', async () => {
          const { req, res } = mockPOSTRequest(
            {
              product_id: product.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              id: expect.any(String),
              user_id: userId,
              product_id: product.id,
              price_formatted: '88819.099919 COIN',
            },
          })

          const userProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: json.data.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!userProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(userProductOrder.buyerId).toEqual(userId)
          expect(userProductOrder.productId).toEqual(product.id)
          expect(userProductOrder.sellerMarketplaceId).toEqual(
            userMarketplace.id
          )
          expect(userProductOrder.sellerMarketplaceTokenId).toEqual(
            userMarketplaceToken.id
          )
          expect(userProductOrder.sellerWalletAddress).toEqual('0xDEADBEEF')
          expect(userProductOrder.price.toString()).toEqual('88819.099919')
          expect(userProductOrder.priceFormatted).toEqual('88819.099919 COIN')
          expect(userProductOrder.priceDecimals).toEqual(18)
          expect(userProductOrder.createdAt).not.toBeNull()
          expect(userProductOrder.updatedAt).toEqual(userProductOrder.createdAt)
          expect(userProductOrder.pendingAt).toBeNull()
          expect(userProductOrder.confirmedAt).toBeNull()
          expect(userProductOrder.cancelledAt).toBeNull()
          expect(userProductOrder.refundedAt).toBeNull()
          expect(userProductOrder.transactions).toHaveLength(0)
        })
      })

      describe('when there is confirmed order', () => {
        beforeEach(async () => {
          await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: '42.099919',
              priceFormatted: '42.099919 COIN',
              priceDecimals: 18,
              sellerWalletAddress: '0xDEADBEEF',
              confirmedAt: new Date(),
            },
          })
        })

        it('creates an unpaid order', async () => {
          const { req, res } = mockPOSTRequest(
            {
              product_id: product.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              id: expect.any(String),
              user_id: userId,
              product_id: product.id,
              price_formatted: '88819.099919 COIN',
            },
          })

          const userProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: json.data.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!userProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(userProductOrder.buyerId).toEqual(userId)
          expect(userProductOrder.productId).toEqual(product.id)
          expect(userProductOrder.sellerMarketplaceId).toEqual(
            userMarketplace.id
          )
          expect(userProductOrder.sellerMarketplaceTokenId).toEqual(
            userMarketplaceToken.id
          )
          expect(userProductOrder.sellerWalletAddress).toEqual('0xDEADBEEF')
          expect(userProductOrder.price.toString()).toEqual('88819.099919')
          expect(userProductOrder.priceFormatted).toEqual('88819.099919 COIN')
          expect(userProductOrder.priceDecimals).toEqual(18)
          expect(userProductOrder.createdAt).not.toBeNull()
          expect(userProductOrder.updatedAt).toEqual(userProductOrder.createdAt)
          expect(userProductOrder.pendingAt).toBeNull()
          expect(userProductOrder.confirmedAt).toBeNull()
          expect(userProductOrder.cancelledAt).toBeNull()
          expect(userProductOrder.refundedAt).toBeNull()
          expect(userProductOrder.transactions).toHaveLength(0)
        })
      })

      describe('when there is cancelled order', () => {
        beforeEach(async () => {
          await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: '42.099919',
              priceFormatted: '42.099919 COIN',
              priceDecimals: 18,
              sellerWalletAddress: '0xDEADBEEF',
              cancelledAt: new Date(),
            },
          })
        })

        it('creates an unpaid order', async () => {
          const { req, res } = mockPOSTRequest(
            {
              product_id: product.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              id: expect.any(String),
              user_id: userId,
              product_id: product.id,
              price_formatted: '88819.099919 COIN',
            },
          })

          const userProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: json.data.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!userProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(userProductOrder.buyerId).toEqual(userId)
          expect(userProductOrder.productId).toEqual(product.id)
          expect(userProductOrder.sellerMarketplaceId).toEqual(
            userMarketplace.id
          )
          expect(userProductOrder.sellerMarketplaceTokenId).toEqual(
            userMarketplaceToken.id
          )
          expect(userProductOrder.sellerWalletAddress).toEqual('0xDEADBEEF')
          expect(userProductOrder.price.toString()).toEqual('88819.099919')
          expect(userProductOrder.priceFormatted).toEqual('88819.099919 COIN')
          expect(userProductOrder.createdAt).not.toBeNull()
          expect(userProductOrder.updatedAt).toEqual(userProductOrder.createdAt)
          expect(userProductOrder.pendingAt).toBeNull()
          expect(userProductOrder.confirmedAt).toBeNull()
          expect(userProductOrder.cancelledAt).toBeNull()
          expect(userProductOrder.refundedAt).toBeNull()
          expect(userProductOrder.transactions).toHaveLength(0)
        })
      })

      describe('when there is refunded order', () => {
        beforeEach(async () => {
          await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: '42.099919',
              priceFormatted: '42.099919 COIN',
              priceDecimals: 18,
              sellerWalletAddress: '0xDEADBEEF',
              refundedAt: new Date(),
            },
          })
        })

        it('creates an unpaid order', async () => {
          const { req, res } = mockPOSTRequest(
            {
              product_id: product.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              id: expect.any(String),
              user_id: userId,
              product_id: product.id,
              price_formatted: '88819.099919 COIN',
            },
          })

          const userProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: json.data.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!userProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(userProductOrder.buyerId).toEqual(userId)
          expect(userProductOrder.productId).toEqual(product.id)
          expect(userProductOrder.sellerMarketplaceId).toEqual(
            userMarketplace.id
          )
          expect(userProductOrder.sellerMarketplaceTokenId).toEqual(
            userMarketplaceToken.id
          )
          expect(userProductOrder.sellerWalletAddress).toEqual('0xDEADBEEF')
          expect(userProductOrder.price.toString()).toEqual('88819.099919')
          expect(userProductOrder.priceFormatted).toEqual('88819.099919 COIN')
          expect(userProductOrder.priceDecimals).toEqual(18)
          expect(userProductOrder.createdAt).not.toBeNull()
          expect(userProductOrder.updatedAt).toEqual(userProductOrder.createdAt)
          expect(userProductOrder.pendingAt).toBeNull()
          expect(userProductOrder.confirmedAt).toBeNull()
          expect(userProductOrder.cancelledAt).toBeNull()
          expect(userProductOrder.refundedAt).toBeNull()
          expect(userProductOrder.transactions).toHaveLength(0)
        })
      })
    })
  })
})
