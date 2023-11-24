import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  getUserMarketplaces,
  MarketplaceDoesNotHaveOwnerWalletAddress,
  MarketplaceDoesNotHaveSmartContractAddress,
  UserDoesNotExist,
} from '@/useCases/getUserMarketplaces'
import { cleanDatabase } from '../helpers'
import type { SellerMarketplace, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserMarketplaces', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserMarketplaces({
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
        const result = await getUserMarketplaces({
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

  describe('when marketplace is confirmed but does not have owner wallet address', () => {
    let user: User

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

      const networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })

      const userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaces({
          ...request,
          userId: user.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(MarketplaceDoesNotHaveOwnerWalletAddress)
        expect((e as MarketplaceDoesNotHaveOwnerWalletAddress).message).toEqual(
          'Marketplace does not have owner wallet address'
        )
      }
    })
  })

  describe('when marketplace is confirmed but does not have smart contract address', () => {
    let user: User

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

      const networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })

      const userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '0xWALLET',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaces({
          ...request,
          userId: user.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(MarketplaceDoesNotHaveSmartContractAddress)
        expect(
          (e as MarketplaceDoesNotHaveSmartContractAddress).message
        ).toEqual('Marketplace does not have smart contract address')
      }
    })
  })

  describe('when everything is good', () => {
    let user: User,
      draftMarketplace1: SellerMarketplace,
      draftMarketplace2: SellerMarketplace,
      pendingMarketplaceWithFailedTransaction: SellerMarketplace,
      pendingMarketplaceWithPendingTransaction: SellerMarketplace,
      confirmedMarketplace: SellerMarketplace

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
          blockchainExplorerURL: 'https://localhost1/',
        },
      })

      const network2 = await prisma.network.create({
        data: {
          title: 'Network 2',
          chainId: 2,
          blockchainExplorerURL: 'https://localhost2/',
        },
      })

      const networkMarketplace1 = await prisma.networkMarketplace.create({
        data: {
          networkId: network1.id,
          smartContractAddress: '0xDEADBEEF1',
          commissionRate: 1,
        },
      })

      const networkMarketplace1Token =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace1.id,
            decimals: 18,
            symbol: 'COIN1',
          },
        })

      const networkMarketplace2 = await prisma.networkMarketplace.create({
        data: {
          networkId: network2.id,
          smartContractAddress: '0xDEADBEEF2',
          commissionRate: 2,
        },
      })

      const networkMarketplace2Token =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace2.id,
            decimals: 18,
            symbol: 'COIN2',
          },
        })

      draftMarketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          networkMarketplaceId: networkMarketplace1.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: draftMarketplace1.id,
          networkMarketplaceTokenId: networkMarketplace1Token.id,
        },
      })

      draftMarketplace2 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          networkMarketplaceId: networkMarketplace2.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: draftMarketplace2.id,
          networkMarketplaceTokenId: networkMarketplace2Token.id,
        },
      })

      pendingMarketplaceWithFailedTransaction =
        await prisma.sellerMarketplace.create({
          data: {
            sellerId: user.id,
            networkId: network1.id,
            networkMarketplaceId: networkMarketplace1.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
            pendingAt: new Date(),
          },
        })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: pendingMarketplaceWithFailedTransaction.id,
          networkMarketplaceTokenId: networkMarketplace1Token.id,
        },
      })

      pendingMarketplaceWithPendingTransaction =
        await prisma.sellerMarketplace.create({
          data: {
            sellerId: user.id,
            networkId: network1.id,
            networkMarketplaceId: networkMarketplace1.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
            pendingAt: new Date(),
          },
        })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: pendingMarketplaceWithPendingTransaction.id,
          networkMarketplaceTokenId: networkMarketplace1Token.id,
        },
      })

      confirmedMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          networkMarketplaceId: networkMarketplace1.id,
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xWALLET',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: confirmedMarketplace.id,
          networkMarketplaceTokenId: networkMarketplace1Token.id,
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          sellerMarketplaceId: pendingMarketplaceWithFailedTransaction.id,
          hash: '0xHASH1',
          failedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          sellerMarketplaceId: pendingMarketplaceWithPendingTransaction.id,
          hash: '0xHASH2',
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          sellerMarketplaceId: confirmedMarketplace.id,
          hash: '0xHASH3',
          confirmedAt: new Date(),
        },
      })

      // This record will be skipped because belongs to another user
      await prisma.sellerMarketplace.create({
        data: {
          sellerId: anotherUser.id,
          networkId: network1.id,
          networkMarketplaceId: networkMarketplace1.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })
    })

    it('returns marketplaces', async () => {
      const userMarketplaces = await getUserMarketplaces({
        ...request,
        userId: user.id,
      })

      expect(userMarketplaces).toHaveLength(5)

      expect(userMarketplaces[0]).toEqual({
        id: confirmedMarketplace.id,
        networkTitle: 'Network 1',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF1',
        commissionRate: 1,
        smartContractAddress: '0xCONTRACT',
        ownerWalletAddress: '0xWALLET',
        tokens: ['COIN1'],
        status: 'confirmed',
      })

      expect(userMarketplaces[1]).toEqual({
        id: pendingMarketplaceWithPendingTransaction.id,
        networkTitle: 'Network 1',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF1',
        commissionRate: 1,
        smartContractAddress: null,
        ownerWalletAddress: null,
        tokens: ['COIN1'],
        status: 'awaiting_confirmation',
      })

      expect(userMarketplaces[2]).toEqual({
        id: pendingMarketplaceWithFailedTransaction.id,
        networkTitle: 'Network 1',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF1',
        commissionRate: 1,
        smartContractAddress: null,
        ownerWalletAddress: null,
        tokens: ['COIN1'],
        status: 'draft',
      })

      expect(userMarketplaces[3]).toEqual({
        id: draftMarketplace2.id,
        networkTitle: 'Network 2',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF2',
        commissionRate: 2,
        smartContractAddress: null,
        ownerWalletAddress: null,
        tokens: ['COIN2'],
        status: 'draft',
      })

      expect(userMarketplaces[4]).toEqual({
        id: draftMarketplace1.id,
        networkTitle: 'Network 1',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF1',
        commissionRate: 1,
        smartContractAddress: null,
        ownerWalletAddress: null,
        tokens: ['COIN1'],
        status: 'draft',
      })
    })
  })
})
