import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/products'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequest,
  parseJSON,
} from '../../../helpers'
import type { ProductCategory, SellerMarketplaceToken } from '@prisma/client'

const ENDPOINT = '/api/user/products'

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
      describe('when title is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest(
            {
              description: '',
              price: '',
              user_marketplace_token_id: '',
              product_category_id: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['title: Required'],
          })
        })
      })

      describe('when description is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest(
            {
              title: '',
              price: '',
              user_marketplace_token_id: '',
              product_category_id: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['description: Required'],
          })
        })
      })

      describe('when price is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest(
            {
              title: '',
              description: '',
              user_marketplace_token_id: '',
              product_category_id: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['price: Required'],
          })
        })
      })

      describe('when user_marketplace_token_id is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest(
            {
              title: '',
              description: '',
              price: '',
              product_category_id: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['user_marketplace_token_id: Required'],
          })
        })
      })

      describe('when product_category_id is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest(
            {
              title: '',
              description: '',
              price: '0',
              user_marketplace_token_id: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['product_category_id: Required'],
          })
        })
      })
    })

    describe('when user_marketplace_token_id is not a valid uuid', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '0.1',
            user_marketplace_token_id: 'test',
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['userMarketplaceTokenId: Invalid uuid'],
        })
      })
    })

    describe('when product_category_id is not a valid uuid', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '0.1',
            user_marketplace_token_id: uuidv4(),
            product_category_id: 'test',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['productCategoryId: Invalid uuid'],
        })
      })
    })

    describe('when title is an empty string', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: ' ',
            description: '',
            price: '0.1',
            user_marketplace_token_id: uuidv4(),
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['productTitle: String must contain at least 1 character(s)'],
        })
      })
    })

    describe('when token does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '0.1',
            user_marketplace_token_id: uuidv4(),
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Token does not exist',
        })
      })
    })

    describe('when price is not a valid number', () => {
      let userMarketplaceToken: SellerMarketplaceToken

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
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: 'z',
            user_marketplace_token_id: userMarketplaceToken.id,
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Invalid product price',
        })
      })
    })

    describe('when price is a negative number', () => {
      let userMarketplaceToken: SellerMarketplaceToken

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
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '-0.1',
            user_marketplace_token_id: userMarketplaceToken.id,
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Product price must be positive',
        })
      })
    })

    describe('when price is a zero', () => {
      let userMarketplaceToken: SellerMarketplaceToken

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
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '0',
            user_marketplace_token_id: userMarketplaceToken.id,
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Product price must be positive',
        })
      })
    })

    describe('when product category does not exist', () => {
      let userMarketplaceToken: SellerMarketplaceToken

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
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: 'Title',
            description: '',
            price: '0.1',
            user_marketplace_token_id: userMarketplaceToken.id,
            product_category_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Product category does not exist',
        })
      })
    })

    describe('when everything is great', () => {
      let userMarketplaceToken: SellerMarketplaceToken,
        productCategory: ProductCategory

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
          },
        })

        userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })

        productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })
      })

      it('creates a draft product', async () => {
        const { req, res } = mockPOSTRequest(
          {
            title: ' Product Title ',
            description: ' Product Description ',
            price: '88819.0000000000099919',
            user_marketplace_token_id: userMarketplaceToken.id,
            product_category_id: productCategory.id,
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
            product_category_id: productCategory.id,
            user_marketplace_token_id: userMarketplaceToken.id,
            slug: 'product-title',
            title: 'Product Title',
            description: 'Product Description',
            content: '',
            price_formatted: '88819.0000000000099919 COIN',
          },
        })

        const userProduct = await prisma.product.findUnique({
          where: {
            id: json.data.id,
          },
          include: {
            productImages: true,
            productOrders: true,
          },
        })

        if (!userProduct) {
          throw new Error('Product does not exist')
        }

        expect(userProduct.sellerId).toEqual(userId)
        expect(userProduct.categoryId).toEqual(productCategory.id)
        expect(userProduct.sellerMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(userProduct.slug).toEqual('product-title')
        expect(userProduct.title).toEqual('Product Title')
        expect(userProduct.description).toEqual('Product Description')
        expect(userProduct.content).toEqual('')
        expect(userProduct.price.toString()).toEqual('88819.0000000000099919')
        expect(userProduct.priceDecimals).toEqual(18)
        expect(userProduct.priceFormatted).toEqual(
          '88819.0000000000099919 COIN'
        )
        expect(userProduct.createdAt).not.toBeNull()
        expect(userProduct.updatedAt).toEqual(userProduct.createdAt)
        expect(userProduct.publishedAt).toBeNull()

        expect(userProduct.productImages).toHaveLength(0)
        expect(userProduct.productOrders).toHaveLength(0)
      })
    })
  })
})
