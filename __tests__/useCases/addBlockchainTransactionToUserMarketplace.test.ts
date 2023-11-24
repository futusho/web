import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  addBlockchainTransactionToUserMarketplace,
  UserDoesNotExist,
  MarketplaceDoesNotExist,
  MarketplaceIsAlreadyConfirmed,
  ConfirmedTransactionFound,
  MarketplaceHasPendingTransaction,
} from '@/useCases/addBlockchainTransactionToUserMarketplace'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
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

describe('addBlockchainTransactionToUserMarketplace', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceId: uuidv4(),
    transactionHash: '0xDEADBEEF',
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserMarketplace({
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

  describe('when userMarketplaceId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userMarketplaceId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userMarketplaceId: Invalid uuid',
        ])
      }
    })
  })

  describe('when transactionHash is an empty string', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          transactionHash: ' ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'transactionHash: Must be a hexadecimal value and start with 0x',
        ])
      }
    })
  })

  describe('when transactionHash is not a valid hash', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          transactionHash: 'invalid-hash',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'transactionHash: Must be a hexadecimal value and start with 0x',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await addBlockchainTransactionToUserMarketplace({
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
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(MarketplaceDoesNotExist)
        expect((e as MarketplaceDoesNotExist).message).toEqual(
          'Marketplace does not exist'
        )
      }
    })
  })

  describe('when user marketplace exists and already confirmed', () => {
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
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          transactionHash: '0xDEADBEEF',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictError)
        expect(e).toBeInstanceOf(MarketplaceIsAlreadyConfirmed)
        expect((e as MarketplaceIsAlreadyConfirmed).message).toEqual(
          'Marketplace is already confirmed'
        )
      }
    })
  })

  describe('when user marketplace is not confirmed but has confirmed transaction', () => {
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
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          transactionHash: '0xDEADBEEF',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(ConfirmedTransactionFound)
        expect((e as ConfirmedTransactionFound).message).toEqual(
          'The marketplace is not in a confirmed state, but there is a confirmed transaction associated with it'
        )
      }
    })
  })

  describe('when user marketplace has pending transaction', () => {
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

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0xHASH',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          transactionHash: '0xDEADBEEF',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictError)
        expect(e).toBeInstanceOf(MarketplaceHasPendingTransaction)
        expect((e as MarketplaceHasPendingTransaction).message).toEqual(
          'There are pending transactions that must be processed before adding a new one'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User, network: Network, networkMarketplace: NetworkMarketplace

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
    })

    describe('when marketplace is draft', () => {
      let userMarketplace: SellerMarketplace

      beforeEach(async () => {
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

      it('adds transaction', async () => {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          transactionHash: ' 0xDEADBEEF ',
        })

        const transactions = await prisma.sellerMarketplaceTransaction.findMany(
          {
            where: {
              sellerMarketplaceId: userMarketplace.id,
            },
          }
        )

        expect(transactions).toHaveLength(1)
        expect(transactions[0].confirmedAt).toBeNull()
        expect(transactions[0].failedAt).toBeNull()
      })

      it('sets marketplace as pending', async () => {
        await addBlockchainTransactionToUserMarketplace({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          transactionHash: ' 0xDEADBEEF ',
        })

        const updatedUserMarketplace = await prisma.sellerMarketplace.findFirst(
          {
            where: {
              sellerId: user.id,
              id: userMarketplace.id,
            },
          }
        )

        if (!updatedUserMarketplace) {
          throw new Error('Unable to get user marketplace')
        }

        expect(updatedUserMarketplace.pendingAt).not.toBeNull()
      })
    })

    describe('when marketplace is pending', () => {
      let userMarketplace: SellerMarketplace

      beforeEach(async () => {
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
      })

      describe('without transactions', () => {
        it('adds transaction', async () => {
          await addBlockchainTransactionToUserMarketplace({
            ...request,
            userId: user.id,
            userMarketplaceId: userMarketplace.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const transactions =
            await prisma.sellerMarketplaceTransaction.findMany({
              where: {
                sellerMarketplaceId: userMarketplace.id,
              },
            })

          expect(transactions).toHaveLength(1)
          expect(transactions[0].confirmedAt).toBeNull()
          expect(transactions[0].failedAt).toBeNull()
        })

        it('does not change pending status for marketplace', async () => {
          await addBlockchainTransactionToUserMarketplace({
            ...request,
            userId: user.id,
            userMarketplaceId: userMarketplace.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const updatedUserMarketplace =
            await prisma.sellerMarketplace.findFirst({
              where: {
                sellerId: user.id,
                id: userMarketplace.id,
              },
            })

          if (!updatedUserMarketplace) {
            throw new Error('Unable to get user marketplace')
          }

          expect(updatedUserMarketplace.pendingAt).toEqual(
            userMarketplace.pendingAt
          )
        })
      })

      describe('when there is a failed transaction already', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              sellerMarketplaceId: userMarketplace.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
        })

        it('adds transaction', async () => {
          await addBlockchainTransactionToUserMarketplace({
            ...request,
            userId: user.id,
            userMarketplaceId: userMarketplace.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const transactions =
            await prisma.sellerMarketplaceTransaction.findMany({
              where: {
                sellerMarketplaceId: userMarketplace.id,
              },
              orderBy: {
                createdAt: 'desc',
              },
            })

          expect(transactions).toHaveLength(2)
          expect(transactions[0].confirmedAt).toBeNull()
          expect(transactions[0].failedAt).toBeNull()
          expect(transactions[1].confirmedAt).toBeNull()
          expect(transactions[1].failedAt).not.toBeNull()
        })

        it('does not change pending status for marketplace', async () => {
          await addBlockchainTransactionToUserMarketplace({
            ...request,
            userId: user.id,
            userMarketplaceId: userMarketplace.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const updatedUserMarketplace =
            await prisma.sellerMarketplace.findFirst({
              where: {
                sellerId: user.id,
                id: userMarketplace.id,
              },
            })

          if (!updatedUserMarketplace) {
            throw new Error('Unable to get user marketplace')
          }

          expect(updatedUserMarketplace.pendingAt).toEqual(
            userMarketplace.pendingAt
          )
        })
      })
    })
  })
})
