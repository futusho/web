import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  cancelUserProductOrder,
  PendingOrderMustHaveTransactions,
  ProductOrderCannotBeCancelled,
  UserDoesNotExist,
  ProductOrderDoesNotExist,
  PendingOrderMustNotHaveConfirmedTransactions,
  DraftOrderMustNotHaveTransactions,
} from '@/useCases/cancelUserProductOrder'
import {
  ClientError,
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

describe('cancelUserProductOrder', () => {
  const request = {
    userId: uuidv4(),
    userProductOrderId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await cancelUserProductOrder({
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
        await cancelUserProductOrder({
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

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await cancelUserProductOrder({
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
        await cancelUserProductOrder({
          ...request,
          userId: user.id,
          userProductOrderId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductOrderDoesNotExist)
        expect((e as ProductOrderDoesNotExist).message).toEqual(
          'Order does not exist'
        )
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

    describe('when user product is a draft', () => {
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
        it('cancels order', async () => {
          await cancelUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          const updatedProductOrder = await prisma.productOrder.findFirst({
            where: {
              buyerId: user.id,
              id: userProductOrder.id,
            },
          })

          if (!updatedProductOrder) {
            throw new Error('Unable to get user product order')
          }

          expect(updatedProductOrder.cancelledAt).not.toBeNull()
        })
      })

      describe('when there is confirmed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
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

      describe('when there is pending transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
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

      describe('when there is failed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
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

    describe('when user product is pending', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
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

      describe('when there is confirmed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
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

      describe('when there is pending transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is failed transaction', () => {
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

        it('cancels order', async () => {
          await cancelUserProductOrder({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          const updatedProductOrder = await prisma.productOrder.findFirst({
            where: {
              buyerId: user.id,
              id: userProductOrder.id,
            },
          })

          if (!updatedProductOrder) {
            throw new Error('Unable to get user product order')
          }

          expect(updatedProductOrder.cancelledAt).not.toBeNull()
        })
      })
    })

    describe('when user product is cancelled', () => {
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

      describe('when there are no transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is confirmed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is pending transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is failed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })
    })

    describe('when user product is refunded', () => {
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

      describe('when there are no transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is confirmed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is pending transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is failed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })
    })

    describe('when user product is confirmed', () => {
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

      describe('when there are no transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is confirmed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is pending transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })

      describe('when there is failed transaction', () => {
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
            await cancelUserProductOrder({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })
          } catch (e) {
            expect(e).toBeInstanceOf(ClientError)
            expect(e).toBeInstanceOf(ProductOrderCannotBeCancelled)
            expect((e as ProductOrderCannotBeCancelled).message).toEqual(
              'Order cannot be cancelled'
            )
          }
        })
      })
    })
  })
})
