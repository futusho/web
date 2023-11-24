import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/orders/[order_id]/transactions'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequestWithQuery,
  parseJSON,
} from '../../../../../helpers'
import type {
  Network,
  Product,
  ProductOrder,
  SellerMarketplace,
  SellerMarketplaceToken,
} from '@prisma/client'

const ENDPOINT = '/api/user/orders/[order_id]/transactions'

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

    describe('request validations', () => {
      describe('when tx_hash is missing', () => {
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
            errors: ['tx_hash: Required'],
          })
        })
      })
    })

    describe('when tx_hash is not a valid HEX', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: uuidv4(),
          },
          {
            tx_hash: 'hash',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: [
            'transactionHash: Must be a hexadecimal value and start with 0x',
          ],
        })
      })
    })

    describe('when order does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: uuidv4(),
          },
          {
            tx_hash: '0x95b1b782',
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
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
          {
            tx_hash: '0x95b1b782',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order was confirmed',
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
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
          {
            tx_hash: '0x95b1b782',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order was cancelled',
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
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
          {
            tx_hash: '0x95b1b782',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Order was refunded',
        })
      })
    })

    describe('when order is not confirmed, but there is a confirmed transaction', () => {
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

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
            sellerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
          },
        })

        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            hash: '0xHASH',
            networkId: network.id,
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            order_id: userProductOrder.id,
          },
          {
            tx_hash: '0x95b1b782',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Pending order must not have confirmed transactions',
        })
      })
    })

    describe('when there is a pending transaction', () => {
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

        const product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
            sellerWalletAddress: '0xDEADBEEF',
            pendingAt: new Date(),
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
          {
            tx_hash: '0x95b1b782',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(409)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Pending order has pending transaction',
        })
      })
    })

    describe('when everything is great', () => {
      let network: Network,
        userMarketplace: SellerMarketplace,
        userMarketplaceToken: SellerMarketplaceToken,
        product: Product

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

        product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: '42.099919',
            priceDecimals: 18,
            priceFormatted: '42.099919 COIN',
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
              price: '42.099919',
              priceDecimals: 18,
              priceFormatted: '42.099919 COIN',
              sellerWalletAddress: '0xDEADBEEF',
            },
          })
        })

        it('creates a new transaction', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              order_id: userProductOrder.id,
            },
            {
              tx_hash: '0x95b1b782',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: { success: true },
          })

          const updatedUserProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!updatedUserProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(updatedUserProductOrder.pendingAt).not.toBeNull()
          expect(updatedUserProductOrder.confirmedAt).toBeNull()
          expect(updatedUserProductOrder.cancelledAt).toBeNull()
          expect(updatedUserProductOrder.refundedAt).toBeNull()
          expect(updatedUserProductOrder.transactions).toHaveLength(1)

          const transaction = updatedUserProductOrder.transactions[0]

          expect(transaction.networkId).toEqual(network.id)
          expect(transaction.hash).toEqual('0x95b1b782')
          expect(transaction.failedAt).toBeNull()
          expect(transaction.confirmedAt).toBeNull()
          expect(transaction.buyerWalletAddress).toEqual('')
          expect(transaction.gas).toEqual(0)
          expect(transaction.transactionFee).toEqual('')
          expect(transaction.blockchainError).toEqual('')
        })
      })

      describe('when order is pending and has failed transactions', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: userId,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              price: '42.099919',
              priceDecimals: 18,
              priceFormatted: '42.099919 COIN',
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

        it('creates a new transaction', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              order_id: userProductOrder.id,
            },
            {
              tx_hash: '0x95b1b782',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(201)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: { success: true },
          })

          const updatedUserProductOrder = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
            include: {
              transactions: true,
            },
          })

          if (!updatedUserProductOrder) {
            throw new Error('Product order does not exist')
          }

          expect(updatedUserProductOrder.pendingAt).not.toBeNull()
          expect(updatedUserProductOrder.confirmedAt).toBeNull()
          expect(updatedUserProductOrder.cancelledAt).toBeNull()
          expect(updatedUserProductOrder.refundedAt).toBeNull()
          expect(updatedUserProductOrder.transactions).toHaveLength(2)

          const failedTransaction = updatedUserProductOrder.transactions[0]

          expect(failedTransaction.networkId).toEqual(network.id)
          expect(failedTransaction.hash).toEqual('0xHASH')
          expect(failedTransaction.failedAt).not.toBeNull()
          expect(failedTransaction.confirmedAt).toBeNull()
          expect(failedTransaction.buyerWalletAddress).toEqual('')
          expect(failedTransaction.gas).toEqual(0)
          expect(failedTransaction.transactionFee).toEqual('')
          expect(failedTransaction.blockchainError).toEqual('')

          const pendingTransaction = updatedUserProductOrder.transactions[1]

          expect(pendingTransaction.networkId).toEqual(network.id)
          expect(pendingTransaction.hash).toEqual('0x95b1b782')
          expect(pendingTransaction.failedAt).toBeNull()
          expect(pendingTransaction.confirmedAt).toBeNull()
          expect(pendingTransaction.buyerWalletAddress).toEqual('')
          expect(pendingTransaction.gas).toEqual(0)
          expect(pendingTransaction.transactionFee).toEqual('')
          expect(pendingTransaction.blockchainError).toEqual('')
        })
      })
    })
  })
})
