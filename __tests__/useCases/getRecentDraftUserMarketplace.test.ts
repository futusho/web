import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getRecentDraftUserMarketplace,
  UserDoesNotExist,
  MarketplaceDoesNotExist,
} from '@/useCases/getRecentDraftUserMarketplace'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  NetworkMarketplace,
  SellerMarketplace,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getRecentDraftUserMarketplace', () => {
  const request = {
    userId: uuidv4(),
    networkMarketplaceId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentDraftUserMarketplace({
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

  describe('when networkMarketplaceId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentDraftUserMarketplace({
          ...request,
          networkMarketplaceId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'networkMarketplaceId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentDraftUserMarketplace({
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

  describe('when network marketplace does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentDraftUserMarketplace({
          ...request,
          userId: user.id,
          networkMarketplaceId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(MarketplaceDoesNotExist)
        expect((e as MarketplaceDoesNotExist).message).toEqual(
          'Marketplace does not exist'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User,
      network: Network,
      networkMarketplace: NetworkMarketplace,
      userMarketplace: SellerMarketplace

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })

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
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })

      // This record will be skipped
      await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      // This record will be skipped
      await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          pendingAt: new Date(),
        },
      })

      // This record will be skipped
      await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns recent user draft marketplace', async () => {
      const recentDraftMarketplace = await getRecentDraftUserMarketplace({
        userId: user.id,
        networkMarketplaceId: networkMarketplace.id,
      })

      expect(recentDraftMarketplace.id).toEqual(userMarketplace.id)
      expect(recentDraftMarketplace.sellerId).toEqual(user.id)
      expect(recentDraftMarketplace.networkId).toEqual(network.id)
      expect(recentDraftMarketplace.networkMarketplaceId).toEqual(
        networkMarketplace.id
      )
    })
  })
})
