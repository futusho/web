import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  addBlockchainTransactionToUserPayout,
  UserDoesNotExist,
  PayoutDoesNotExist,
  PayoutWasConfirmed,
  PayoutWasCancelled,
  PendingPayoutMustHaveTransactions,
  PendingPayoutMustNotHaveConfirmedTransactions,
  PendingPayoutHasPendingTransaction,
  DraftPayoutMustNotHaveTransactions,
} from '@/useCases/addBlockchainTransactionToUserPayout'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  SellerPayout,
  SellerMarketplace,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('addBlockchainTransactionToUserPayout', () => {
  const request = {
    userId: uuidv4(),
    userPayoutId: uuidv4(),
    transactionHash: '0xDEADBEEF',
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserPayout({
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
        await addBlockchainTransactionToUserPayout({
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

  describe('when transactionHash is an empty string', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserPayout({
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
        await addBlockchainTransactionToUserPayout({
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
        await addBlockchainTransactionToUserPayout({
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
        await addBlockchainTransactionToUserPayout({
          ...request,
          userId: user.id,
          userPayoutId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(PayoutDoesNotExist)
        expect((e as PayoutDoesNotExist).message).toEqual(
          'Payout does not exist'
        )
      }
    })
  })

  describe('when payout exists', () => {
    let user: User,
      network: Network,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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

      userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          confirmedAt: new Date(),
          smartContractAddress: '0xCONTRACT',
          ownerWalletAddress: '0xWALLET',
        },
      })

      userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })
    })

    describe('when payout is confirmed', () => {
      let userPayout: SellerPayout

      beforeEach(async () => {
        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            amount: '1233.09391929',
            amountFormatted: '1233.09391929 COIN',
            decimals: 18,
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          await addBlockchainTransactionToUserPayout({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
            transactionHash: ' 0xDEADBEEF ',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(PayoutWasConfirmed)
          expect((e as PayoutWasConfirmed).message).toEqual(
            'Payout was confirmed'
          )
        }
      })
    })

    describe('when payout is cancelled', () => {
      let userPayout: SellerPayout

      beforeEach(async () => {
        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            amount: '1233.09391929',
            amountFormatted: '1233.09391929 COIN',
            decimals: 18,
            cancelledAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          await addBlockchainTransactionToUserPayout({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
            transactionHash: ' 0xDEADBEEF ',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(PayoutWasCancelled)
          expect((e as PayoutWasCancelled).message).toEqual(
            'Payout was cancelled'
          )
        }
      })
    })

    describe('when payout is pending', () => {
      let userPayout: SellerPayout

      beforeEach(async () => {
        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            amount: '1233.09391929',
            amountFormatted: '1233.09391929 COIN',
            decimals: 18,
            pendingAt: new Date(),
          },
        })
      })

      describe('when there are no transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(PendingPayoutMustHaveTransactions)
            expect((e as PendingPayoutMustHaveTransactions).message).toEqual(
              'Pending payout must have transactions'
            )
          }
        })
      })

      describe('when there is a confirmed transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              PendingPayoutMustNotHaveConfirmedTransactions
            )
            expect(
              (e as PendingPayoutMustNotHaveConfirmedTransactions).message
            ).toEqual('Pending payout must not have confirmed transactions')
          }
        })
      })

      describe('when there is a pending transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ConflictError)
            expect(e).toBeInstanceOf(PendingPayoutHasPendingTransaction)
            expect((e as PendingPayoutHasPendingTransaction).message).toEqual(
              'Pending payout has pending transaction'
            )
          }
        })
      })

      describe('when there is a failed transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
        })

        it('adds a new transaction', async () => {
          await addBlockchainTransactionToUserPayout({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const payoutAfter = await prisma.sellerPayout.findUnique({
            where: {
              id: userPayout.id,
            },
          })

          if (!payoutAfter) {
            throw new Error('Unable to get payout')
          }

          expect(payoutAfter.pendingAt).toEqual(userPayout.pendingAt)
          expect(payoutAfter.confirmedAt).toBeNull()
          expect(payoutAfter.cancelledAt).toBeNull()

          const addedTransaction =
            await prisma.sellerPayoutTransaction.findFirst({
              where: {
                networkId: network.id,
                sellerPayoutId: userPayout.id,
                hash: '0xdeadbeef',
              },
            })

          if (!addedTransaction) {
            throw new Error('Unable to get payout transaction')
          }

          expect(addedTransaction.confirmedAt).toBeNull()
          expect(addedTransaction.failedAt).toBeNull()
          expect(addedTransaction.ownerWalletAddress).toEqual('')
          expect(addedTransaction.gas).toEqual(0)
          expect(addedTransaction.transactionFee).toEqual('')
          expect(addedTransaction.blockchainError).toEqual('')
        })
      })
    })

    describe('when payout is draft', () => {
      let userPayout: SellerPayout

      beforeEach(async () => {
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

      describe('when there are no transactions', () => {
        it('adds a new transaction', async () => {
          await addBlockchainTransactionToUserPayout({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const payoutAfter = await prisma.sellerPayout.findUnique({
            where: {
              id: userPayout.id,
            },
          })

          if (!payoutAfter) {
            throw new Error('Unable to get payout')
          }

          expect(payoutAfter.pendingAt).not.toBeNull()
          expect(payoutAfter.confirmedAt).toBeNull()
          expect(payoutAfter.cancelledAt).toBeNull()

          const addedTransaction =
            await prisma.sellerPayoutTransaction.findFirst({
              where: {
                networkId: network.id,
                sellerPayoutId: userPayout.id,
                hash: '0xdeadbeef',
              },
            })

          if (!addedTransaction) {
            throw new Error('Unable to get payout transaction')
          }

          expect(addedTransaction.confirmedAt).toBeNull()
          expect(addedTransaction.failedAt).toBeNull()
          expect(addedTransaction.ownerWalletAddress).toEqual('')
          expect(addedTransaction.gas).toEqual(0)
          expect(addedTransaction.transactionFee).toEqual('')
          expect(addedTransaction.blockchainError).toEqual('')
        })
      })

      describe('when there is a confirmed transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftPayoutMustNotHaveTransactions)
            expect((e as DraftPayoutMustNotHaveTransactions).message).toEqual(
              'Draft payout must not have transactions'
            )
          }
        })
      })

      describe('when there is a pending transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftPayoutMustNotHaveTransactions)
            expect((e as DraftPayoutMustNotHaveTransactions).message).toEqual(
              'Draft payout must not have transactions'
            )
          }
        })
      })

      describe('when there is a failed transaction', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserPayout({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftPayoutMustNotHaveTransactions)
            expect((e as DraftPayoutMustNotHaveTransactions).message).toEqual(
              'Draft payout must not have transactions'
            )
          }
        })
      })
    })
  })
})
