import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getUserMarketplaceTokens,
  UserDoesNotExist,
} from '@/useCases/getUserMarketplaceTokens'
import { cleanDatabase } from '../helpers'
import type { SellerMarketplaceToken, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserMarketplaceTokens', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserMarketplaceTokens({
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

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceTokens({
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

  describe('when everything is good', () => {
    let user: User,
      user1Marketplace1Coin: SellerMarketplaceToken,
      user1Marketplace1Token: SellerMarketplaceToken,
      user1Marketplace2Coin: SellerMarketplaceToken

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })

      const anotherUser = await prisma.user.create({
        data: {},
      })

      const network1 = await prisma.network.create({
        data: {
          title: 'Network 1',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const network2 = await prisma.network.create({
        data: {
          title: 'Network 2',
          chainId: 2,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const network1Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network1.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })

      const network2Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network2.id,
          smartContractAddress: '0xBEEF',
          commissionRate: 2,
        },
      })

      const network1MarketplaceCoin =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network1Marketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })

      const network1MarketplaceToken =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network1Marketplace.id,
            decimals: 18,
            symbol: 'TOKEN',
            smartContractAddress: '0xTOKEN',
          },
        })

      const network2MarketplaceCoin =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network2Marketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })

      const user1Marketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          networkMarketplaceId: network1Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const user1Marketplace2 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          networkMarketplaceId: network2Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      const user1Marketplace3 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          networkMarketplaceId: network2Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const user2Marketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: anotherUser.id,
          networkId: network1.id,
          networkMarketplaceId: network1Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      user1Marketplace1Coin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace1.id,
          networkMarketplaceTokenId: network1MarketplaceCoin.id,
        },
      })

      user1Marketplace1Token = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace1.id,
          networkMarketplaceTokenId: network1MarketplaceToken.id,
        },
      })

      user1Marketplace2Coin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace2.id,
          networkMarketplaceTokenId: network2MarketplaceCoin.id,
        },
      })

      // This record will be skipped because marketplace is not confirmed
      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user1Marketplace3.id,
          networkMarketplaceTokenId: network2MarketplaceCoin.id,
        },
      })

      // This record will be skipped because its another user data
      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: user2Marketplace1.id,
          networkMarketplaceTokenId: network1MarketplaceCoin.id,
        },
      })
    })

    it('returns tokens', async () => {
      const userMarketplaceTokens = await getUserMarketplaceTokens({
        userId: user.id,
      })

      expect(userMarketplaceTokens).toHaveLength(3)

      expect(userMarketplaceTokens[0]).toEqual({
        id: user1Marketplace1Coin.id,
        displayName: 'Network 1 - COIN',
      })

      expect(userMarketplaceTokens[1]).toEqual({
        id: user1Marketplace1Token.id,
        displayName: 'Network 1 - TOKEN',
      })

      expect(userMarketplaceTokens[2]).toEqual({
        id: user1Marketplace2Coin.id,
        displayName: 'Network 2 - COIN',
      })
    })
  })
})
