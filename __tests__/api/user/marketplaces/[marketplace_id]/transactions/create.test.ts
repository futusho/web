import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/marketplaces/[marketplace_id]/transactions'
import {
  cleanDatabase,
  createUserWithSession,
  mockPOSTRequestWithQuery,
  parseJSON,
} from '../../../../../helpers'
import type { Network, SellerMarketplace } from '@prisma/client'

const ENDPOINT = '/api/user/marketplaces/[marketplace_id]/transactions'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`POST ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockPOSTRequestWithQuery(
        { marketplace_id: 'id' },
        {},
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

    describe('request validations', () => {
      describe('when tx_hash is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              marketplace_id: uuidv4(),
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

    describe('useCase validations', () => {
      describe('when tx_hash is not a valid HEX', () => {
        it('returns error', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              marketplace_id: uuidv4(),
            },
            {
              tx_hash: '0xHASH',
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
    })

    describe('when marketplace does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            marketplace_id: uuidv4(),
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
          message: 'Marketplace does not exist',
        })
      })
    })

    describe('when marketplace is not confirmed', () => {
      let network: Network, sellerMarketplace: SellerMarketplace

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

        sellerMarketplace = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
          },
        })
      })

      describe('when there is a confirmed transaction', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: userId,
              sellerMarketplaceId: sellerMarketplace.id,
              networkId: network.id,
              confirmedAt: new Date(),
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
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
            message:
              'The marketplace is not in a confirmed state, but there is a confirmed transaction associated with it',
          })
        })
      })

      describe('when there is a pending transaction', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: userId,
              sellerMarketplaceId: sellerMarketplace.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          const { req, res } = mockPOSTRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
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
            message:
              'There are pending transactions that must be processed before adding a new one',
          })
        })
      })
    })

    describe('when everything is great', () => {
      let sellerMarketplace: SellerMarketplace

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

        sellerMarketplace = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network.id,
            networkMarketplaceId: networkMarketplace.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
          },
        })
      })

      // FIXME: Add test case when marketplace is pending, but all transactions were failed
      it('creates a transaction', async () => {
        const { req, res } = mockPOSTRequestWithQuery(
          {
            marketplace_id: sellerMarketplace.id,
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

        const sellerMarketplaceAfterUpdate =
          await prisma.sellerMarketplace.findUnique({
            where: {
              id: sellerMarketplace.id,
            },
            include: {
              sellerMarketplaceTransactions: true,
            },
          })

        if (!sellerMarketplaceAfterUpdate) {
          throw new Error('Seller marketplace does not exist')
        }

        expect(sellerMarketplaceAfterUpdate.pendingAt).not.toBeNull()
        expect(sellerMarketplaceAfterUpdate.confirmedAt).toBeNull()
        expect(sellerMarketplaceAfterUpdate.smartContractAddress).toEqual('')
        expect(sellerMarketplaceAfterUpdate.ownerWalletAddress).toEqual('')
        expect(
          sellerMarketplaceAfterUpdate.sellerMarketplaceTransactions
        ).toHaveLength(1)

        const transaction =
          sellerMarketplaceAfterUpdate.sellerMarketplaceTransactions[0]

        expect(transaction.networkId).toEqual(
          sellerMarketplaceAfterUpdate.networkId
        )
        expect(transaction.hash).toEqual('0x95b1b782')
        expect(transaction.failedAt).toBeNull()
        expect(transaction.confirmedAt).toBeNull()
        expect(transaction.senderAddress).toEqual('')
        expect(transaction.gas).toEqual(0)
        expect(transaction.transactionFee).toEqual('')
        expect(transaction.blockchainError).toEqual('')
      })
    })
  })
})
