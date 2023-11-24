import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/marketplaces/[marketplace_id]/status'
import {
  cleanDatabase,
  createUserWithSession,
  mockGETRequestWithQuery,
  parseJSON,
} from '../../../../helpers'
import type {
  Network,
  NetworkMarketplace,
  SellerMarketplace,
} from '@prisma/client'

const ENDPOINT = '/api/user/marketplaces/[marketplace_id]/status'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`GET ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockGETRequestWithQuery({ marketplace_id: 'id' }, '')

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

    describe('when marketplace does not exist', () => {
      it('returns error', async () => {
        const { req, res } = mockGETRequestWithQuery(
          { marketplace_id: uuidv4() },
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

    describe('when everything is good', () => {
      let network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0x330a83003bBCADe286237347f4fA9Ab4dF604D1e',
            commissionRate: 1,
          },
        })
      })

      describe('when marketplace is created', () => {
        let sellerMarketplace: SellerMarketplace

        beforeEach(async () => {
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

        it('returns draft status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              status: 'draft',
            },
          })
        })
      })

      describe('when marketplace is confirmed', () => {
        let sellerMarketplace: SellerMarketplace

        beforeEach(async () => {
          sellerMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: userId,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              smartContractAddress:
                '0xA2959D3F95eAe5dC7D70144Ce1b73b403b7EB6E0',
              ownerWalletAddress: '0x7193207dcFB43C7C0564bB46cDa09797C4274610',
              confirmedAt: new Date(),
            },
          })

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

        it('returns confirmed status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
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

      describe('when marketplace is pending and has only failed transactions', () => {
        let sellerMarketplace: SellerMarketplace

        beforeEach(async () => {
          sellerMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: userId,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              smartContractAddress: '',
              ownerWalletAddress: '',
              pendingAt: new Date(),
            },
          })

          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: userId,
              sellerMarketplaceId: sellerMarketplace.id,
              networkId: network.id,
              failedAt: new Date(),
              hash: '0xHASH',
            },
          })
        })

        it('returns pending status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(200)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: true,
            data: {
              status: 'pending',
            },
          })
        })
      })

      describe('when marketplace is pending and has unprocessed transaction', () => {
        let sellerMarketplace: SellerMarketplace

        beforeEach(async () => {
          sellerMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: userId,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              smartContractAddress: '',
              ownerWalletAddress: '',
              pendingAt: new Date(),
            },
          })

          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: userId,
              sellerMarketplaceId: sellerMarketplace.id,
              networkId: network.id,
              failedAt: new Date(),
              hash: '0xHASH1',
            },
          })

          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: userId,
              sellerMarketplaceId: sellerMarketplace.id,
              networkId: network.id,
              hash: '0xHASH2',
            },
          })
        })

        it('returns awaiting_confirmation status', async () => {
          const { req, res } = mockGETRequestWithQuery(
            {
              marketplace_id: sellerMarketplace.id,
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
