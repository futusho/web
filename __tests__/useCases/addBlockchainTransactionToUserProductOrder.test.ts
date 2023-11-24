import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  addBlockchainTransactionToUserProductOrder,
  UserDoesNotExist,
  OrderDoesNotExist,
  OrderWasConfirmed,
  OrderWasRefunded,
  OrderWasCancelled,
  PendingOrderMustHaveTransactions,
  PendingOrderMustNotHaveConfirmedTransactions,
  PendingOrderHasPendingTransaction,
  DraftOrderMustNotHaveTransactions,
} from '@/useCases/addBlockchainTransactionToUserProductOrder'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  Product,
  ProductOrder,
  SellerMarketplace,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('addBlockchainTransactionToUserProductOrder', () => {
  const request = {
    userId: uuidv4(),
    userProductOrderId: uuidv4(),
    transactionHash: '0xDEADBEEF',
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserProductOrder({
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

  describe('when userProductOrderId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserProductOrder({
          ...request,
          userProductOrderId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userProductOrderId: Invalid uuid',
        ])
      }
    })
  })

  describe('when transactionHash is an empty string', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await addBlockchainTransactionToUserProductOrder({
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
        await addBlockchainTransactionToUserProductOrder({
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
        await addBlockchainTransactionToUserProductOrder({
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

  describe('when product order does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await addBlockchainTransactionToUserProductOrder({
          ...request,
          userId: user.id,
          userProductOrderId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(OrderDoesNotExist)
        expect((e as OrderDoesNotExist).message).toEqual('Order does not exist')
      }
    })
  })

  describe('when product order exists', () => {
    let user: User,
      network: Network,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken,
      product: Product

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

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      product = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          publishedAt: new Date(),
        },
      })
    })

    describe('when order is confirmed', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1233.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1233.09391929 COIN',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          await addBlockchainTransactionToUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
            transactionHash: ' 0xDEADBEEF ',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(OrderWasConfirmed)
          expect((e as OrderWasConfirmed).message).toEqual(
            'Order was confirmed'
          )
        }
      })
    })

    describe('when order is refunded', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1233.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1233.09391929 COIN',
            refundedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          await addBlockchainTransactionToUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
            transactionHash: ' 0xDEADBEEF ',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(OrderWasRefunded)
          expect((e as OrderWasRefunded).message).toEqual('Order was refunded')
        }
      })
    })

    describe('when order is cancelled', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1233.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1233.09391929 COIN',
            cancelledAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          await addBlockchainTransactionToUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
            transactionHash: ' 0xDEADBEEF ',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(OrderWasCancelled)
          expect((e as OrderWasCancelled).message).toEqual(
            'Order was cancelled'
          )
        }
      })
    })

    describe('when order is pending', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1233.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1233.09391929 COIN',
            pendingAt: new Date(),
          },
        })
      })

      describe('when there are no transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(PendingOrderMustHaveTransactions)
            expect((e as PendingOrderMustHaveTransactions).message).toEqual(
              'Pending order must have transactions'
            )
          }
        })
      })

      describe('when there is a confirmed transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              PendingOrderMustNotHaveConfirmedTransactions
            )
            expect(
              (e as PendingOrderMustNotHaveConfirmedTransactions).message
            ).toEqual('Pending order must not have confirmed transactions')
          }
        })
      })

      describe('when there is a pending transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ConflictError)
            expect(e).toBeInstanceOf(PendingOrderHasPendingTransaction)
            expect((e as PendingOrderHasPendingTransaction).message).toEqual(
              'Pending order has pending transaction'
            )
          }
        })
      })

      describe('when there is a failed transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
        })

        it('adds a new transaction', async () => {
          await addBlockchainTransactionToUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const productOrderAfter = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
          })

          if (!productOrderAfter) {
            throw new Error('Unable to get product order')
          }

          expect(productOrderAfter.pendingAt).toEqual(
            userProductOrder.pendingAt
          )
          expect(productOrderAfter.confirmedAt).toBeNull()
          expect(productOrderAfter.refundedAt).toBeNull()
          expect(productOrderAfter.cancelledAt).toBeNull()

          const addedTransaction =
            await prisma.productOrderTransaction.findFirst({
              where: {
                networkId: network.id,
                productOrderId: userProductOrder.id,
                hash: '0xdeadbeef',
              },
            })

          if (!addedTransaction) {
            throw new Error('Unable to get product order transaction')
          }

          expect(addedTransaction.confirmedAt).toBeNull()
          expect(addedTransaction.failedAt).toBeNull()
          expect(addedTransaction.buyerWalletAddress).toEqual('')
          expect(addedTransaction.gas).toEqual(0)
          expect(addedTransaction.transactionFee).toEqual('')
          expect(addedTransaction.blockchainError).toEqual('')
        })
      })
    })

    describe('when order is draft', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
        userProductOrder = await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1233.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1233.09391929 COIN',
          },
        })
      })

      describe('when there are no transactions', () => {
        it('adds a new transaction', async () => {
          await addBlockchainTransactionToUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
            transactionHash: ' 0xDEADBEEF ',
          })

          const productOrderAfter = await prisma.productOrder.findUnique({
            where: {
              id: userProductOrder.id,
            },
          })

          if (!productOrderAfter) {
            throw new Error('Unable to get product order')
          }

          expect(productOrderAfter.pendingAt).not.toBeNull()
          expect(productOrderAfter.confirmedAt).toBeNull()
          expect(productOrderAfter.refundedAt).toBeNull()
          expect(productOrderAfter.cancelledAt).toBeNull()

          const addedTransaction =
            await prisma.productOrderTransaction.findFirst({
              where: {
                networkId: network.id,
                productOrderId: userProductOrder.id,
                hash: '0xdeadbeef',
              },
            })

          if (!addedTransaction) {
            throw new Error('Unable to get product order transaction')
          }

          expect(addedTransaction.confirmedAt).toBeNull()
          expect(addedTransaction.failedAt).toBeNull()
          expect(addedTransaction.buyerWalletAddress).toEqual('')
          expect(addedTransaction.gas).toEqual(0)
          expect(addedTransaction.transactionFee).toEqual('')
          expect(addedTransaction.blockchainError).toEqual('')
        })
      })

      describe('when there is a confirmed transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftOrderMustNotHaveTransactions)
            expect((e as DraftOrderMustNotHaveTransactions).message).toEqual(
              'Draft order must not have transactions'
            )
          }
        })
      })

      describe('when there is a pending transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftOrderMustNotHaveTransactions)
            expect((e as DraftOrderMustNotHaveTransactions).message).toEqual(
              'Draft order must not have transactions'
            )
          }
        })
      })

      describe('when there is a failed transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            await addBlockchainTransactionToUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
              transactionHash: ' 0xDEADBEEF ',
            })
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftOrderMustNotHaveTransactions)
            expect((e as DraftOrderMustNotHaveTransactions).message).toEqual(
              'Draft order must not have transactions'
            )
          }
        })
      })
    })
  })
})
