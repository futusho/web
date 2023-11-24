import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  createDraftUserMarketplace,
  UserDoesNotExist,
  NetworkMarketplaceDoesNotExist,
  NetworkMarketplaceDoesNotHaveTokens,
} from '@/useCases/createDraftUserMarketplace'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  NetworkMarketplace,
  NetworkMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('createDraftUserMarketplace', () => {
  const request = {
    userId: uuidv4(),
    networkMarketplaceId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await createDraftUserMarketplace({
          ...request,
          userId: 'not-an-uuid',
        })
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
        await createDraftUserMarketplace({
          ...request,
          networkMarketplaceId: 'not-an-uuid',
        })
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
        await createDraftUserMarketplace({
          ...request,
          userId: uuidv4(),
        })
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
        await createDraftUserMarketplace({
          ...request,
          userId: user.id,
          networkMarketplaceId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(NetworkMarketplaceDoesNotExist)
        expect((e as NetworkMarketplaceDoesNotExist).message).toEqual(
          'Network marketplace does not exist'
        )
      }
    })
  })

  describe('when network marketplace does not have tokens', () => {
    let user: User, networkMarketplace: NetworkMarketplace

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

      networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createDraftUserMarketplace({
          ...request,
          userId: user.id,
          networkMarketplaceId: networkMarketplace.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(NetworkMarketplaceDoesNotHaveTokens)
        expect((e as NetworkMarketplaceDoesNotHaveTokens).message).toEqual(
          'Network marketplace does not have tokens'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User,
      network: Network,
      networkMarketplace: NetworkMarketplace,
      networkMarketplaceCoin: NetworkMarketplaceToken,
      networkMarketplaceToken: NetworkMarketplaceToken

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

      networkMarketplaceCoin = await prisma.networkMarketplaceToken.create({
        data: {
          marketplaceId: networkMarketplace.id,
          decimals: 18,
          symbol: 'COIN',
        },
      })

      networkMarketplaceToken = await prisma.networkMarketplaceToken.create({
        data: {
          marketplaceId: networkMarketplace.id,
          decimals: 18,
          smartContractAddress: '0xTOKEN',
          symbol: 'TOKEN',
        },
      })
    })

    it('creates a new user marketplace', async () => {
      await createDraftUserMarketplace({
        userId: user.id,
        networkMarketplaceId: networkMarketplace.id,
      })

      const userMarketplace = await prisma.sellerMarketplace.findFirst({
        where: {
          sellerId: user.id,
        },
        include: {
          tokens: true,
          productOrders: true,
          sellerMarketplaceTransactions: true,
        },
      })

      if (!userMarketplace) {
        throw new Error('Unable to get user marketplace')
      }

      expect(userMarketplace.networkId).toEqual(network.id)
      expect(userMarketplace.networkMarketplaceId).toEqual(
        networkMarketplace.id
      )
      expect(userMarketplace.smartContractAddress).toEqual('')
      expect(userMarketplace.ownerWalletAddress).toEqual('')
      expect(userMarketplace.pendingAt).toBeNull()
      expect(userMarketplace.confirmedAt).toBeNull()

      expect(userMarketplace.tokens).toHaveLength(2)
      expect(userMarketplace.tokens[0].networkMarketplaceTokenId).toEqual(
        networkMarketplaceCoin.id
      )
      expect(userMarketplace.tokens[1].networkMarketplaceTokenId).toEqual(
        networkMarketplaceToken.id
      )

      expect(userMarketplace.productOrders).toHaveLength(0)
      expect(userMarketplace.sellerMarketplaceTransactions).toHaveLength(0)
    })
  })
})
