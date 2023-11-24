import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getUserPayoutTransactionStatus,
  UserDoesNotExist,
  UserPayoutDoesNotExist,
  UserPayoutTransactionDoesNotExist,
} from '@/useCases/getUserPayoutTransactionStatus'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  SellerPayout,
  SellerPayoutTransaction,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserPayoutTransactionStatus', () => {
  const request = {
    userId: uuidv4(),
    userPayoutId: uuidv4(),
    userPayoutTransactionId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await getUserPayoutTransactionStatus({
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

  describe('when userPayoutId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await getUserPayoutTransactionStatus({
          ...request,
          userPayoutId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userPayoutId: Invalid uuid',
        ])
      }
    })
  })

  describe('when userPayoutTransactionId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await getUserPayoutTransactionStatus({
          ...request,
          userPayoutTransactionId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userPayoutTransactionId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserPayoutTransactionStatus({
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

  describe('when payout does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserPayoutTransactionStatus({
          ...request,
          userId: user.id,
          userPayoutId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserPayoutDoesNotExist)
        expect((e as UserPayoutDoesNotExist).message).toEqual(
          'Payout does not exist'
        )
      }
    })
  })

  describe('when payout transaction does not exist', () => {
    let user: User, userPayout: SellerPayout

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

      const userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          confirmedAt: new Date(),
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xWALLET',
        },
      })

      const userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      userPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1233.09391929',
          amountFormatted: '1233.09391929 COIN',
          decimals: 18,
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserPayoutTransactionStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
          userPayoutTransactionId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserPayoutTransactionDoesNotExist)
        expect((e as UserPayoutTransactionDoesNotExist).message).toEqual(
          'Payout transaction does not exist'
        )
      }
    })
  })

  describe('when payout transaction exists', () => {
    let user: User, userPayout: SellerPayout, network: Network

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
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          confirmedAt: new Date(),
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xWALLET',
        },
      })

      const userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      userPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1233.09391929',
          amountFormatted: '1233.09391929 COIN',
          decimals: 18,
        },
      })
    })

    describe('when transaction is confirmed', () => {
      let userPayoutTransaction: SellerPayoutTransaction

      beforeEach(async () => {
        userPayoutTransaction = await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns confirmed status', async () => {
        const status = await getUserPayoutTransactionStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
          userPayoutTransactionId: userPayoutTransaction.id,
        })

        expect(status).toEqual('confirmed')
      })
    })

    describe('when transaction is failed', () => {
      let userPayoutTransaction: SellerPayoutTransaction

      beforeEach(async () => {
        userPayoutTransaction = await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            failedAt: new Date(),
          },
        })
      })

      it('returns failed status', async () => {
        const status = await getUserPayoutTransactionStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
          userPayoutTransactionId: userPayoutTransaction.id,
        })

        expect(status).toEqual('failed')
      })
    })

    describe('when transaction is pending', () => {
      let userPayoutTransaction: SellerPayoutTransaction

      beforeEach(async () => {
        userPayoutTransaction = await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
          },
        })
      })

      it('returns awaiting_confirmation status', async () => {
        const status = await getUserPayoutTransactionStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
          userPayoutTransactionId: userPayoutTransaction.id,
        })

        expect(status).toEqual('awaiting_confirmation')
      })
    })
  })
})
