import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/marketplaces'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequest,
  parseJSON,
} from '../../../helpers'
import type {
  Network,
  NetworkMarketplace,
  NetworkMarketplaceToken,
} from '@prisma/client'

const ENDPOINT = '/api/user/marketplaces'

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
      describe('when marketplace_id is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequest({}, sessionToken)

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['marketplace_id: Required'],
          })
        })
      })
    })

    describe('when marketplace_id is not a valid uuid', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            marketplace_id: 'qwerty',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(422)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          errors: ['networkMarketplaceId: Invalid uuid'],
        })
      })
    })

    describe('when marketplace_id does not exist', () => {
      it('returns validation error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            marketplace_id: uuidv4(),
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(400)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Network marketplace does not exist',
        })
      })
    })

    describe('when marketplace does not have tokens', () => {
      let networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        const network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      it('returns error', async () => {
        const { req, res } = mockPOSTRequest(
          {
            marketplace_id: networkMarketplace.id,
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(500)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: false,
          message: 'Network marketplace does not have tokens',
        })
      })
    })

    describe('when everything is great', () => {
      let network: Network,
        networkMarketplace: NetworkMarketplace,
        networkMarketplaceToken: NetworkMarketplaceToken

      beforeEach(async () => {
        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost/',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })

        networkMarketplaceToken = await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })
      })

      it('creates a draft marketplace', async () => {
        const { req, res } = mockPOSTRequest(
          {
            marketplace_id: networkMarketplace.id,
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
            seller_id: userId,
            network_id: network.id,
            network_marketplace_id: networkMarketplace.id,
          },
        })

        const sellerMarketplace = await prisma.sellerMarketplace.findUnique({
          where: {
            id: json.data.id,
          },
          include: {
            tokens: {
              select: {
                id: true,
              },
            },
            productOrders: {
              select: {
                id: true,
              },
            },
            sellerMarketplaceTransactions: {
              select: {
                id: true,
              },
            },
          },
        })

        if (!sellerMarketplace) {
          throw new Error('Seller marketplace does not exist')
        }

        expect(sellerMarketplace.sellerId).toEqual(userId)
        expect(sellerMarketplace.networkId).toEqual(network.id)
        expect(sellerMarketplace.networkMarketplaceId).toEqual(
          networkMarketplace.id
        )
        expect(sellerMarketplace.smartContractAddress).toEqual('')
        expect(sellerMarketplace.ownerWalletAddress).toEqual('')
        expect(sellerMarketplace.createdAt).not.toBeNull()
        expect(sellerMarketplace.updatedAt).toEqual(sellerMarketplace.createdAt)
        expect(sellerMarketplace.pendingAt).toBeNull()
        expect(sellerMarketplace.confirmedAt).toBeNull()
        expect(sellerMarketplace.tokens).toHaveLength(1)
        expect(sellerMarketplace.productOrders).toHaveLength(0)
        expect(sellerMarketplace.sellerMarketplaceTransactions).toHaveLength(0)

        const sellerMarketplaceToken =
          await prisma.sellerMarketplaceToken.findUnique({
            where: {
              id: sellerMarketplace.tokens[0].id,
            },
            include: {
              products: {
                select: {
                  id: true,
                },
              },
              productOrders: {
                select: {
                  id: true,
                },
              },
            },
          })

        if (!sellerMarketplaceToken) {
          throw new Error('Seller marketplace token does not exist')
        }

        expect(sellerMarketplaceToken.sellerMarketplaceId).toEqual(
          sellerMarketplace.id
        )
        expect(sellerMarketplaceToken.networkMarketplaceTokenId).toEqual(
          networkMarketplaceToken.id
        )
        expect(sellerMarketplaceToken.createdAt).not.toBeNull()
        expect(sellerMarketplaceToken.updatedAt).toEqual(
          sellerMarketplaceToken.createdAt
        )
        expect(sellerMarketplaceToken.products).toHaveLength(0)
        expect(sellerMarketplaceToken.productOrders).toHaveLength(0)
      })
    })
  })
})
