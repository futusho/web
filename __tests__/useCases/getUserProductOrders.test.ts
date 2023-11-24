import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  CancelledOrderMustNotHaveConfirmedTransactions,
  CancelledOrderMustNotHavePendingTransactions,
  ConfirmedOrderDoesNotHaveConfirmedTransaction,
  DraftOrderMustNotHaveTransactions,
  getUserProductOrders,
  PendingOrderMustHaveTransactions,
  PendingOrderMustNotHaveConfirmedTransactions,
  RefundedOrderDoesNotHaveConfirmedTransaction,
  UserDoesNotExist,
} from '@/useCases/getUserProductOrders'
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

describe('getUserProductOrders', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProductOrders({
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
        const result = await getUserProductOrders({
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

  describe('when there are no orders for a requested user', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })

      const anotherUser = await prisma.user.create({
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
          sellerId: anotherUser.id,
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

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      const product = await prisma.product.create({
        data: {
          sellerId: anotherUser.id,
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

      await prisma.productOrder.create({
        data: {
          buyerId: anotherUser.id,
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

    it('returns empty array', async () => {
      const userOrders = await getUserProductOrders({
        userId: user.id,
      })

      expect(userOrders).toEqual([])
    })
  })

  describe('when order exists', () => {
    let user: User,
      network: Network,
      product: Product,
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
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
          },
        })
      })

      describe('when order does not have transactions', () => {
        it('returns cancellable draft order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'draft',
              cancellable: true,
            },
          ])
        })
      })

      describe('when order has pending transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftOrderMustNotHaveTransactions)
            expect((e as DraftOrderMustNotHaveTransactions).message).toEqual(
              'Draft order must not have transactions'
            )
          }
        })
      })

      describe('when order has failed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(DraftOrderMustNotHaveTransactions)
            expect((e as DraftOrderMustNotHaveTransactions).message).toEqual(
              'Draft order must not have transactions'
            )
          }
        })
      })

      describe('when order has confirmed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
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
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            pendingAt: new Date(),
          },
        })
      })

      describe('when order does not have transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(PendingOrderMustHaveTransactions)
            expect((e as PendingOrderMustHaveTransactions).message).toEqual(
              'Pending order must have transactions'
            )
          }
        })
      })

      describe('when order has pending transaction', () => {
        beforeEach(async () => {
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns non cancellable awaiting for confirmation order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'awaiting_confirmation',
              cancellable: false,
            },
          ])
        })
      })

      describe('when order has failed transaction', () => {
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

        it('returns cancellable pending order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'pending',
              cancellable: true,
            },
          ])
        })
      })

      describe('when order has confirmed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
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
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            refundedAt: new Date(),
          },
        })
      })

      describe('when order does not have transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              RefundedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Refunded order does not have confirmed transaction')
          }
        })
      })

      describe('when order has pending transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              RefundedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Refunded order does not have confirmed transaction')
          }
        })
      })

      describe('when order has failed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              RefundedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Refunded order does not have confirmed transaction')
          }
        })
      })

      describe('when order has confirmed transaction', () => {
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

        it('returns non cancellable refunded order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'refunded',
              cancellable: false,
            },
          ])
        })
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
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            cancelledAt: new Date(),
          },
        })
      })

      describe('when order does not have transactions', () => {
        it('returns non cancellable cancelled order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'cancelled',
              cancellable: false,
            },
          ])
        })
      })

      describe('when order has pending transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              CancelledOrderMustNotHavePendingTransactions
            )
            expect(
              (e as CancelledOrderMustNotHavePendingTransactions).message
            ).toEqual('Cancelled order must not have pending transactions')
          }
        })
      })

      describe('when order has failed transaction', () => {
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

        it('returns non cancellable cancelled order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'cancelled',
              cancellable: false,
            },
          ])
        })
      })

      describe('when order has confirmed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              CancelledOrderMustNotHaveConfirmedTransactions
            )
            expect(
              (e as CancelledOrderMustNotHaveConfirmedTransactions).message
            ).toEqual('Cancelled order must not have confirmed transactions')
          }
        })
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
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
          },
        })
      })

      describe('when order does not have transactions', () => {
        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              ConfirmedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as ConfirmedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Confirmed order does not have confirmed transaction')
          }
        })
      })

      describe('when order has pending transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              ConfirmedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as ConfirmedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Confirmed order does not have confirmed transaction')
          }
        })
      })

      describe('when order has failed transaction', () => {
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
            const result = await getUserProductOrders({
              ...request,
              userId: user.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              ConfirmedOrderDoesNotHaveConfirmedTransaction
            )
            expect(
              (e as ConfirmedOrderDoesNotHaveConfirmedTransaction).message
            ).toEqual('Confirmed order does not have confirmed transaction')
          }
        })
      })

      describe('when order has confirmed transaction', () => {
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

        it('returns non cancellable confirmed order', async () => {
          const userOrders = await getUserProductOrders({
            userId: user.id,
          })

          expect(userOrders).toEqual([
            {
              id: userProductOrder.id,
              productTitle: 'Product Title',
              priceFormatted: '1234.09391929 COIN',
              status: 'confirmed',
              cancellable: false,
            },
          ])
        })
      })
    })
  })
})
