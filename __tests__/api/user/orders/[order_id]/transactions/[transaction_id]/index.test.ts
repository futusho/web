import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/orders/[order_id]/transactions/[transaction_id]'
import {
  cleanDatabase,
  createUserWithSession,
  mockGETRequestWithQuery,
  parseJSON,
} from '../../../../../../helpers'
import type {
  Network,
  ProductOrder,
  ProductOrderTransaction,
  SellerMarketplace,
  SellerMarketplaceToken,
} from '@prisma/client'

const ENDPOINT = '/api/user/orders/[order_id]/transactions/[transaction_id]'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`GET ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockGETRequestWithQuery(
        {
          order_id: 'id',
          transaction_id: 'tx_id',
        },
        ''
      )

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

    describe('when order_id is not a valid uuid', () => {
      it('returns error', async () => {
        const { req, res } = mockGETRequestWithQuery(
          {
            order_id: 'test',
            transaction_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['userProductOrderId: Invalid uuid'],
        })
      })
    })

    describe('when transaction_id is not a valid uuid', () => {
      it('returns error', async () => {
        const { req, res } = mockGETRequestWithQuery(
          {
            order_id: uuidv4(),
            transaction_id: 'test',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['userProductOrderTransactionId: Invalid uuid'],
        })
      })
    })

    describe('when order does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockGETRequestWithQuery(
          {
            order_id: uuidv4(),
            transaction_id: uuidv4(),
          },
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

    describe('when order transaction does not exist', () => {
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
            price: '42.099919',
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
            price: '42.099919',
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockGETRequestWithQuery(
          {
            order_id: userProductOrder.id,
            transaction_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order transaction does not exist',
        })
      })
    })

    describe('when everything is great', () => {
      let network: Network,
        userMarketplace: SellerMarketplace,
        userMarketplaceToken: SellerMarketplaceToken,
        userProductOrder: ProductOrder

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

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: '42.099919',
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
            price: '42.099919',
            priceFormatted: '42.099919 COIN',
            priceDecimals: 18,
            sellerWalletAddress: '0xDEADBEEF',
          },
        })
      })

      describe('when transaction is confirmed', () => {
        let userProductOrderTransaction: ProductOrderTransaction

        beforeEach(async () => {
          userProductOrderTransaction =
            await prisma.productOrderTransaction.create({
              data: {
                productOrderId: userProductOrder.id,
                hash: '0xHASH',
                networkId: network.id,
                confirmedAt: new Date(),
              },
            })
        })

        it('returns confirmed status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              order_id: userProductOrder.id,
              transaction_id: userProductOrderTransaction.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              status: 'confirmed',
            },
          })
        })
      })

      describe('when transaction is failed', () => {
        let userProductOrderTransaction: ProductOrderTransaction

        beforeEach(async () => {
          userProductOrderTransaction =
            await prisma.productOrderTransaction.create({
              data: {
                productOrderId: userProductOrder.id,
                hash: '0xHASH',
                networkId: network.id,
                failedAt: new Date(),
              },
            })
        })

        it('returns failed status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              order_id: userProductOrder.id,
              transaction_id: userProductOrderTransaction.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              status: 'failed',
            },
          })
        })
      })

      describe('when transaction is pending', () => {
        let userProductOrderTransaction: ProductOrderTransaction

        beforeEach(async () => {
          userProductOrderTransaction =
            await prisma.productOrderTransaction.create({
              data: {
                productOrderId: userProductOrder.id,
                hash: '0xHASH',
                networkId: network.id,
              },
            })
        })

        it('returns awaiting_confirmation status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              order_id: userProductOrder.id,
              transaction_id: userProductOrderTransaction.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              status: 'awaiting_confirmation',
            },
          })
        })
      })
    })
  })
})
