import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getRecentUserPayout,
  UserPayoutDoesNotExist,
  UserDoesNotExist,
} from '@/useCases/getRecentUserPayout'
import { cleanDatabase } from '../helpers'
import type {
  SellerMarketplace,
  SellerMarketplaceToken,
  SellerPayout,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getRecentUserPayout', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceId: uuidv4(),
    userMarketplaceTokenId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentUserPayout({
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

  describe('when userMarketplaceId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentUserPayout({
          ...request,
          userMarketplaceId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userMarketplaceId: Invalid uuid',
        ])
      }
    })
  })

  describe('when userMarketplaceTokenId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getRecentUserPayout({
          ...request,
          userMarketplaceTokenId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userMarketplaceTokenId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentUserPayout({
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

  describe('when user marketplace does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserPayoutDoesNotExist)
        expect((e as UserPayoutDoesNotExist).message).toEqual(
          'User payout does not exist'
        )
      }
    })
  })

  describe('when user marketplace token does not exist', () => {
    let user: User, userMarketplace: SellerMarketplace

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

      userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getRecentUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserPayoutDoesNotExist)
        expect((e as UserPayoutDoesNotExist).message).toEqual(
          'User payout does not exist'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken,
      userPayout: SellerPayout

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
          sellerId: user.id,
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

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      const product = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-title-2',
          title: 'Product Title',
          description: 'Product Description',
          content: '',
          price: '1232.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 COIN',
        },
      })

      await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          sellerWalletAddress: '0xWALLET',
          price: '1234.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1234.09391929 COIN',
          confirmedAt: new Date(),
        },
      })

      // NOTE: This is going to be skipped
      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1',
          amountFormatted: '1 COIN',
          decimals: 18,
          confirmedAt: new Date(),
        },
      })

      // NOTE: This is going to be skipped
      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1',
          amountFormatted: '1 COIN',
          decimals: 18,
          cancelledAt: new Date(),
        },
      })

      // NOTE: This is going to be skipped
      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1',
          amountFormatted: '1 COIN',
          decimals: 18,
          pendingAt: new Date(),
        },
      })

      userPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1234.09391929',
          amountFormatted: '1234.09391929 COIN',
          decimals: 18,
        },
      })
    })

    it('returns recent payout', async () => {
      const recentUserPayout = await getRecentUserPayout({
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
        userMarketplaceTokenId: userMarketplaceToken.id,
      })

      expect(recentUserPayout.id).toEqual(userPayout.id)
    })
  })
})
