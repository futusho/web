import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  createUserPayout,
  NothingToRequest,
  PendingPayoutExists,
  UserDoesNotExist,
  UserMarketplaceDoesNotExist,
  UserMarketplaceTokenDoesNotExist,
} from '@/useCases/createUserPayout'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  SellerMarketplace,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('createUserPayout', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceId: uuidv4(),
    userMarketplaceTokenId: uuidv4(),
  }

  describe('useCase validations', () => {
    describe('when userId is not a valid uuid', () => {
      it('returns error', async () => {
        expect.assertions(2)

        try {
          await createUserPayout({
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
          await createUserPayout({
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

    describe('when userMarketplaceTokenId is not a valid uuid', () => {
      it('returns error', async () => {
        expect.assertions(2)

        try {
          await createUserPayout({
            ...request,
            userMarketplaceTokenId: 'not-an-uuid',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(UseCaseValidationError)
          expect((e as UseCaseValidationError).errors).toEqual([
            'userMarketplaceTokenId: Invalid uuid',
          ])
        }
      })
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
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
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserMarketplaceDoesNotExist)
        expect((e as UserMarketplaceDoesNotExist).message).toEqual(
          'User marketplace does not exist'
        )
      }
    })
  })

  describe('when user marketplace is not confirmed', () => {
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
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserMarketplaceDoesNotExist)
        expect((e as UserMarketplaceDoesNotExist).message).toEqual(
          'User marketplace does not exist'
        )
      }
    })
  })

  describe('when requested marketplace belongs to another user', () => {
    it.todo('returns error')
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
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserMarketplaceTokenDoesNotExist)
        expect((e as UserMarketplaceTokenDoesNotExist).message).toEqual(
          'User marketplace token does not exist'
        )
      }
    })
  })

  describe('when requested marketplace token belongs to another user', () => {
    it.todo('returns error')
  })

  describe('when there is a draft payout already', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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
          confirmedAt: new Date(),
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

      const userProductOrder = await prisma.productOrder.create({
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

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '1197.0711017113',
          sellerIncomeFormatted: '1197.0711017113 COIN',
          platformIncome: '37.0228175787',
          platformIncomeFormatted: '37.0228175787 COIN',
          decimals: 18,
        },
      })

      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1',
          amountFormatted: '1 COIN',
          decimals: 18,
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(PendingPayoutExists)
        expect((e as PendingPayoutExists).message).toEqual(
          'Pending payout exists'
        )
      }
    })
  })

  describe('when there is a pending payout already', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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
          confirmedAt: new Date(),
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

      const userProductOrder = await prisma.productOrder.create({
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

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '1197.0711017113',
          sellerIncomeFormatted: '1197.0711017113 COIN',
          platformIncome: '37.0228175787',
          platformIncomeFormatted: '37.0228175787 COIN',
          decimals: 18,
        },
      })

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
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(PendingPayoutExists)
        expect((e as PendingPayoutExists).message).toEqual(
          'Pending payout exists'
        )
      }
    })
  })

  describe('when SQL returns an empty response', () => {
    it.todo('not implemented')
  })

  describe('when there are no sales', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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
          confirmedAt: new Date(),
        },
      })

      userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(NothingToRequest)
        expect((e as NothingToRequest).message).toEqual('Nothing to request')
      }
    })
  })

  describe('when there are no payouts', () => {
    it.todo('not implemented')
  })

  describe('when there are no available tokens to withdraw', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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
          confirmedAt: new Date(),
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

      const userProductOrder = await prisma.productOrder.create({
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

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '1197.0711017113',
          sellerIncomeFormatted: '1197.0711017113 COIN',
          platformIncome: '37.0228175787',
          platformIncomeFormatted: '37.0228175787 COIN',
          decimals: 18,
        },
      })

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

      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1197.0711017113',
          amountFormatted: '1197.0711017113 COIN',
          decimals: 18,
          confirmedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(NothingToRequest)
        expect((e as NothingToRequest).message).toEqual('Nothing to request')
      }
    })
  })

  describe('when there are available tokens to withdraw', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken

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
          confirmedAt: new Date(),
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

      const userProductOrder = await prisma.productOrder.create({
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

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '1197.0711017113',
          sellerIncomeFormatted: '1197.0711017113 COIN',
          platformIncome: '37.0228175787',
          platformIncomeFormatted: '37.0228175787 COIN',
          decimals: 18,
        },
      })
    })

    describe('when there is a cancelled payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            amount: '197.0711017112',
            amountFormatted: '197.0711017112 COIN',
            decimals: 18,
            cancelledAt: new Date(),
          },
        })
      })

      it('creates a user payout', async () => {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })

        const userPayouts = await prisma.sellerPayout.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        })

        expect(userPayouts).toHaveLength(2)

        expect(userPayouts[0].amount.toString()).toEqual('1197.0711017113')
        expect(userPayouts[0].amountFormatted.toString()).toEqual(
          '1197.0711017113 COIN'
        )
      })
    })

    describe('when there is a confirmed payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            amount: '197.0711017112',
            amountFormatted: '197.0711017112 COIN',
            decimals: 18,
            confirmedAt: new Date(),
          },
        })
      })

      it('creates a user payout', async () => {
        await createUserPayout({
          ...request,
          userId: user.id,
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
        })

        const userPayouts = await prisma.sellerPayout.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        })

        expect(userPayouts).toHaveLength(2)

        expect(userPayouts[0].amount.toString()).toEqual('1000.0000000001')
        expect(userPayouts[0].amountFormatted.toString()).toEqual(
          '1000.0000000001 COIN'
        )
      })
    })
  })
})
