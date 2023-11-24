import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  getUserMarketplaceStatus,
  UserDoesNotExist,
  MarketplaceDoesNotExist,
  ConfirmedMarketplaceDoesNotHaveConfirmedTransaction,
  DraftMarketplaceMustNotHaveTransactions,
  PendingMarketplaceMustHaveTransactions,
  PendingMarketplaceMustNotHaveConfirmedTransactions,
} from '@/useCases/getUserMarketplaceStatus'
import { cleanDatabase } from '../helpers'
import type { SellerMarketplace, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserMarketplaceStatus', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserMarketplaceStatus({
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
        const result = await getUserMarketplaceStatus({
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

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
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
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: uuidv4(),
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

  describe('when marketplace is created and has pending transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(DraftMarketplaceMustNotHaveTransactions)
        expect((e as DraftMarketplaceMustNotHaveTransactions).message).toEqual(
          'Draft marketplace must not have transactions'
        )
      }
    })
  })

  describe('when marketplace is created and has failed transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH1',
          failedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(DraftMarketplaceMustNotHaveTransactions)
        expect((e as DraftMarketplaceMustNotHaveTransactions).message).toEqual(
          'Draft marketplace must not have transactions'
        )
      }
    })
  })

  describe('when marketplace is created and has confirmed transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(DraftMarketplaceMustNotHaveTransactions)
        expect((e as DraftMarketplaceMustNotHaveTransactions).message).toEqual(
          'Draft marketplace must not have transactions'
        )
      }
    })
  })

  describe('when marketplace is created and does not have transactions', () => {
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

    it('returns draft status', async () => {
      const status = await getUserMarketplaceStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(status).toEqual('draft')
    })
  })

  describe('when marketplace is pending and does not have transactions', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
          pendingAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(PendingMarketplaceMustHaveTransactions)
        expect((e as PendingMarketplaceMustHaveTransactions).message).toEqual(
          'Pending marketplace must have transactions'
        )
      }
    })
  })

  describe('when marketplace is pending and there is confirmed transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
          pendingAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          PendingMarketplaceMustNotHaveConfirmedTransactions
        )
        expect(
          (e as PendingMarketplaceMustNotHaveConfirmedTransactions).message
        ).toEqual('Pending marketplace must not have confirmed transactions')
      }
    })
  })

  describe('when marketplace is pending and there are only failed transactions', () => {
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
          pendingAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH1',
          failedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
          failedAt: new Date(),
        },
      })
    })

    it('returns pending status', async () => {
      const status = await getUserMarketplaceStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(status).toEqual('pending')
    })
  })

  describe('when marketplace is pending and there is pending transaction', () => {
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
          pendingAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH',
        },
      })
    })

    it('returns awaiting_confirmation status', async () => {
      const status = await getUserMarketplaceStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(status).toEqual('awaiting_confirmation')
    })
  })

  describe('when marketplace is confirmed and there is no transactions', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          ConfirmedMarketplaceDoesNotHaveConfirmedTransaction
        )
        expect(
          (e as ConfirmedMarketplaceDoesNotHaveConfirmedTransaction).message
        ).toEqual('Confirmed marketplace does not have confirmed transaction')
      }
    })
  })

  describe('when marketplace is confirmed and there is only pending transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          ConfirmedMarketplaceDoesNotHaveConfirmedTransaction
        )
        expect(
          (e as ConfirmedMarketplaceDoesNotHaveConfirmedTransaction).message
        ).toEqual('Confirmed marketplace does not have confirmed transaction')
      }
    })
  })

  describe('when marketplace is confirmed and there is only failed transaction', () => {
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
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH1',
          failedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          ConfirmedMarketplaceDoesNotHaveConfirmedTransaction
        )
        expect(
          (e as ConfirmedMarketplaceDoesNotHaveConfirmedTransaction).message
        ).toEqual('Confirmed marketplace does not have confirmed transaction')
      }
    })
  })

  describe('when marketplace is confirmed', () => {
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
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH',
          senderAddress: '0xSENDER',
          gas: 999919,
          transactionFee: '0.123456789012345678',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns confirmed status', async () => {
      const status = await getUserMarketplaceStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(status).toEqual('confirmed')
    })
  })
})
