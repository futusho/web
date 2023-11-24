import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getUserProductOrderTransactionStatus,
  UserDoesNotExist,
  UserProductOrderDoesNotExist,
  UserProductOrderTransactionDoesNotExist,
} from '@/useCases/getUserProductOrderTransactionStatus'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  ProductOrder,
  ProductOrderTransaction,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserProductOrderTransactionStatus', () => {
  const request = {
    userId: uuidv4(),
    userProductOrderId: uuidv4(),
    userProductOrderTransactionId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await getUserProductOrderTransactionStatus({
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
        await getUserProductOrderTransactionStatus({
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

  describe('when userProductOrderTransactionId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await getUserProductOrderTransactionStatus({
          ...request,
          userProductOrderTransactionId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userProductOrderTransactionId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserProductOrderTransactionStatus({
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
        await getUserProductOrderTransactionStatus({
          ...request,
          userId: user.id,
          userProductOrderId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserProductOrderDoesNotExist)
        expect((e as UserProductOrderDoesNotExist).message).toEqual(
          'Order does not exist'
        )
      }
    })
  })

  describe('when product order transaction does not exist', () => {
    let user: User, userProductOrder: ProductOrder

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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserProductOrderTransactionStatus({
          ...request,
          userId: user.id,
          userProductOrderId: userProductOrder.id,
          userProductOrderTransactionId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserProductOrderTransactionDoesNotExist)
        expect((e as UserProductOrderTransactionDoesNotExist).message).toEqual(
          'Order transaction does not exist'
        )
      }
    })
  })

  describe('when product order transaction exists', () => {
    let user: User, userProductOrder: ProductOrder, network: Network

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

    describe('when transaction is confirmed', () => {
      let userProductOrderTransaction: ProductOrderTransaction

      beforeEach(async () => {
        userProductOrderTransaction =
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
      })

      it('returns confirmed status', async () => {
        const status = await getUserProductOrderTransactionStatus({
          ...request,
          userId: user.id,
          userProductOrderId: userProductOrder.id,
          userProductOrderTransactionId: userProductOrderTransaction.id,
        })

        expect(status).toEqual('confirmed')
      })
    })

    describe('when transaction is failed', () => {
      let userProductOrderTransaction: ProductOrderTransaction

      beforeEach(async () => {
        userProductOrderTransaction =
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date(),
            },
          })
      })

      it('returns failed status', async () => {
        const status = await getUserProductOrderTransactionStatus({
          ...request,
          userId: user.id,
          userProductOrderId: userProductOrder.id,
          userProductOrderTransactionId: userProductOrderTransaction.id,
        })

        expect(status).toEqual('failed')
      })
    })

    describe('when transaction is pending', () => {
      let userProductOrderTransaction: ProductOrderTransaction

      beforeEach(async () => {
        userProductOrderTransaction =
          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
      })

      it('returns awaiting_confirmation status', async () => {
        const status = await getUserProductOrderTransactionStatus({
          ...request,
          userId: user.id,
          userProductOrderId: userProductOrder.id,
          userProductOrderTransactionId: userProductOrderTransaction.id,
        })

        expect(status).toEqual('awaiting_confirmation')
      })
    })
  })
})
