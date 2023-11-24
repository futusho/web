import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  getUserMarketplaceBasedOnStatus,
  UserDoesNotExist,
  MarketplaceDoesNotExist,
  ConfirmedMarketplaceDoesNotHaveConfirmedTransaction,
  DraftMarketplaceMustNotHaveTransactions,
  PendingMarketplaceMustHaveTransactions,
  PendingMarketplaceMustNotHaveConfirmedTransactions,
  ConfirmedMarketplaceMustHaveSmartContractAddress,
  ConfirmedMarketplaceMustHaveOwnerWalletAddress,
  ConfirmedMarketplaceTransactionMustHaveGas,
  ConfirmedMarketplaceTransactionMustHaveTransactionFee,
} from '@/useCases/getUserMarketplaceBasedOnStatus'
import { cleanDatabase } from '../helpers'
import type {
  SellerMarketplace,
  SellerMarketplaceTransaction,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserMarketplaceBasedOnStatus', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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

    it('returns draft marketplace', async () => {
      const result = await getUserMarketplaceBasedOnStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(result).toEqual({
        id: userMarketplace.id,
        sellerId: user.id,
        networkChainId: 1,
        networkTitle: 'Network',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF',
        blockchainExplorerURL: 'https://localhost',
      })
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
    let user: User,
      userMarketplace: SellerMarketplace,
      failedTransaction1: SellerMarketplaceTransaction,
      failedTransaction2: SellerMarketplaceTransaction

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

      failedTransaction1 = await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH1',
          failedAt: new Date(),
        },
      })

      failedTransaction2 = await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH2',
          failedAt: new Date(),
        },
      })
    })

    it('returns pending marketplace', async () => {
      const result = await getUserMarketplaceBasedOnStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(result).toEqual({
        id: userMarketplace.id,
        sellerId: user.id,
        networkChainId: 1,
        networkTitle: 'Network',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF',
        blockchainExplorerURL: 'https://localhost',
        failedTransactions: [
          {
            transactionHash: '0xHASH2',
            date: failedTransaction2.failedAt,
          },
          {
            transactionHash: '0xHASH1',
            date: failedTransaction1.failedAt,
          },
        ],
      })
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

    it('returns unconfirmed marketplace', async () => {
      const result = await getUserMarketplaceBasedOnStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(result).toEqual({
        id: userMarketplace.id,
        networkTitle: 'Network',
        transactionHash: '0xHASH',
        blockchainExplorerURL: 'https://localhost',
      })
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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
        const result = await getUserMarketplaceBasedOnStatus({
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

  describe('when marketplace is confirmed and there is no smart contract address', () => {
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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceBasedOnStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          ConfirmedMarketplaceMustHaveSmartContractAddress
        )
        expect(
          (e as ConfirmedMarketplaceMustHaveSmartContractAddress).message
        ).toEqual('Confirmed marketplace must have smart contract address')
      }
    })
  })

  describe('when marketplace is confirmed and there is no owner wallet address', () => {
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
          senderAddress: '0xSENDER',
          gas: 999919,
          transactionFee: '0.123456789012345678',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceBasedOnStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(ConfirmedMarketplaceMustHaveOwnerWalletAddress)
        expect(
          (e as ConfirmedMarketplaceMustHaveOwnerWalletAddress).message
        ).toEqual('Confirmed marketplace must have owner wallet address')
      }
    })
  })

  describe('when marketplace is confirmed and there is no gas in confirmed transaction', () => {
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
          hash: '0xHASH',
          senderAddress: '0xSENDER',
          gas: 0,
          transactionFee: '0.123456789012345678',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceBasedOnStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(ConfirmedMarketplaceTransactionMustHaveGas)
        expect(
          (e as ConfirmedMarketplaceTransactionMustHaveGas).message
        ).toEqual('Confirmed marketplace transaction must have gas')
      }
    })
  })

  describe('when marketplace is confirmed and there is no transaction fee in confirmed transaction', () => {
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
          hash: '0xHASH',
          senderAddress: '0xSENDER',
          gas: 1,
          transactionFee: '',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserMarketplaceBasedOnStatus({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          ConfirmedMarketplaceTransactionMustHaveTransactionFee
        )
        expect(
          (e as ConfirmedMarketplaceTransactionMustHaveTransactionFee).message
        ).toEqual('Confirmed marketplace transaction must have transaction fee')
      }
    })
  })

  describe('when marketplace is confirmed', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      confirmedTransaction: SellerMarketplaceTransaction

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

      confirmedTransaction = await prisma.sellerMarketplaceTransaction.create({
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

    it('returns confirmed marketplace', async () => {
      const result = await getUserMarketplaceBasedOnStatus({
        ...request,
        userId: user.id,
        userMarketplaceId: userMarketplace.id,
      })

      expect(result).toEqual({
        networkTitle: 'Network',
        networkMarketplaceSmartContractAddress: '0xDEADBEEF',
        marketplaceSmartContractAddress: '0xMARKETPLACE',
        ownerWalletAddress: '0xOWNER',
        commissionRate: 1,
        gas: 999919,
        transactionFee: '0.123456789012345678',
        confirmedAt: confirmedTransaction.confirmedAt?.toISOString(),
      })
    })
  })
})
