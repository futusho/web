import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import { getUserPayouts, UserDoesNotExist } from '@/useCases/getUserPayouts'
import { cleanDatabase } from '../helpers'
import type { SellerPayout, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserPayouts', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserPayouts({
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
        const result = await getUserPayouts({
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

  describe('when everything is good', () => {
    let user: User,
      user1Payout1: SellerPayout,
      user1Payout2: SellerPayout,
      user1Payout3: SellerPayout,
      user1Payout4: SellerPayout

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })

      const user2 = await prisma.user.create({
        data: {},
      })

      const network1 = await prisma.network.create({
        data: {
          title: 'Network 1',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const network2 = await prisma.network.create({
        data: {
          title: 'Network 2',
          chainId: 2,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const network1Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network1.id,
          smartContractAddress: '0xDEADBEEF1',
          commissionRate: 1,
        },
      })

      const network2Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network2.id,
          smartContractAddress: '0xDEADBEEF2',
          commissionRate: 2,
        },
      })

      const network1MarketplaceCoin =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network1Marketplace.id,
            decimals: 18,
            symbol: 'COIN1',
          },
        })

      const network2MarketplaceCoin =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network2Marketplace.id,
            decimals: 18,
            symbol: 'COIN2',
          },
        })

      const network2MarketplaceToken =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: network1Marketplace.id,
            decimals: 18,
            symbol: 'TOKEN',
            smartContractAddress: '0xCONTRACT',
          },
        })

      const userMarketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          networkMarketplaceId: network1Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const userMarketplace2 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          networkMarketplaceId: network2Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const userMarketplace1Coin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace1.id,
          networkMarketplaceTokenId: network1MarketplaceCoin.id,
        },
      })

      const userMarketplace2Coin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace2.id,
          networkMarketplaceTokenId: network2MarketplaceCoin.id,
        },
      })

      const userMarketplace2Token = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace2.id,
          networkMarketplaceTokenId: network2MarketplaceToken.id,
        },
      })

      const anotherUserMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user2.id,
          networkId: network1.id,
          networkMarketplaceId: network1Marketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      const anotherUserMarketplaceCoin =
        await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: anotherUserMarketplace.id,
            networkMarketplaceTokenId: network1MarketplaceCoin.id,
          },
        })

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category1',
          title: 'Category 1',
          description: 'Description 1',
        },
      })

      const user1Product1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title 1',
          description: 'Product Description 1',
          content: '',
          price: '99.99',
          priceDecimals: 18,
          priceFormatted: '99.99 ' + network1MarketplaceCoin.symbol,
          publishedAt: new Date(),
        },
      })

      const user1Product2 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace2Coin.id,
          categoryId: productCategory.id,
          slug: 'product-title-2',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '66.66',
          priceDecimals: 18,
          priceFormatted: '66.66 ' + network2MarketplaceCoin.symbol,
          publishedAt: new Date(),
        },
      })

      const user1Product3 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          categoryId: productCategory.id,
          slug: 'product-title-3',
          title: 'Product Title 3',
          description: 'Product Description 3',
          content: '',
          price: '33.33',
          priceDecimals: 18,
          priceFormatted: '33.33 ' + network2MarketplaceToken.symbol,
          publishedAt: new Date(),
        },
      })

      const user2Product1 = await prisma.product.create({
        data: {
          sellerId: user2.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceCoin.id,
          categoryId: productCategory.id,
          slug: 'product-title-4',
          title: 'Product Title 4',
          description: 'Product Description 4',
          content: '',
          price: '1232.09391929',
          priceDecimals: 18,
          priceFormatted: '1232.09391929 ' + network1MarketplaceCoin.symbol,
        },
      })

      const user1Product1Order = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: user1Product1.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          sellerWalletAddress: '0xWALLET',
          price: '99.99',
          priceDecimals: 18,
          priceFormatted: '99.99 ' + network1MarketplaceCoin.symbol,
          confirmedAt: new Date(),
        },
      })

      const user1Product2Order = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: user1Product2.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Coin.id,
          sellerWalletAddress: '0xWALLET',
          price: '66.66',
          priceDecimals: 18,
          priceFormatted: '66.66 ' + network2MarketplaceCoin.symbol,
          confirmedAt: new Date(),
        },
      })

      const user1Product3Order = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: user1Product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          sellerWalletAddress: '0xWALLET',
          price: '33.33',
          priceDecimals: 18,
          priceFormatted: '33.33 ' + network2MarketplaceToken.symbol,
          confirmedAt: new Date(),
        },
      })

      const user2Product1Order = await prisma.productOrder.create({
        data: {
          buyerId: user2.id,
          productId: user2Product1.id,
          sellerMarketplaceId: anotherUserMarketplace.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceCoin.id,
          sellerWalletAddress: '0xWALLET',
          price: '99.99',
          priceDecimals: 18,
          priceFormatted: '99.99 ' + network1MarketplaceCoin.symbol,
          confirmedAt: new Date(),
        },
      })

      const user1Product1OrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            hash: '0xHASH1',
            productOrderId: user1Product1Order.id,
            networkId: network1.id,
            confirmedAt: new Date(),
          },
        })

      const user1Product2OrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            hash: '0xHASH2',
            productOrderId: user1Product2Order.id,
            networkId: network2.id,
            confirmedAt: new Date(),
          },
        })

      const user1Product3OrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            hash: '0xHASH3',
            productOrderId: user1Product3Order.id,
            networkId: network2.id,
            confirmedAt: new Date(),
          },
        })

      const user2Product1OrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            hash: '0xHASH4',
            productOrderId: user2Product1Order.id,
            networkId: network1.id,
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: user1Product1.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          productOrderTransactionId: user1Product1OrderTransaction.id,
          sellerIncome: '98.9901',
          sellerIncomeFormatted: '98.9901 ' + network1MarketplaceCoin.symbol,
          platformIncome: '0.9999',
          platformIncomeFormatted: '0.9999 ' + network1MarketplaceCoin.symbol,
          decimals: 18,
        },
      })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: user1Product2.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Coin.id,
          productOrderTransactionId: user1Product2OrderTransaction.id,
          sellerIncome: '65.3268',
          sellerIncomeFormatted: '65.3268 ' + network2MarketplaceCoin.symbol,
          platformIncome: '1.3322',
          platformIncomeFormatted: '1.3322 ' + network2MarketplaceCoin.symbol,
          decimals: 18,
        },
      })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: user1Product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          productOrderTransactionId: user1Product3OrderTransaction.id,
          sellerIncome: '32.6634',
          sellerIncomeFormatted: '32.6634 ' + network2MarketplaceToken.symbol,
          platformIncome: '0.6666',
          platformIncomeFormatted: '0.6666 ' + network2MarketplaceToken.symbol,
          decimals: 18,
        },
      })

      await prisma.productSale.create({
        data: {
          sellerId: user2.id,
          productId: user2Product1.id,
          sellerMarketplaceId: anotherUserMarketplace.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceCoin.id,
          productOrderTransactionId: user2Product1OrderTransaction.id,
          sellerIncome: '98.9901',
          sellerIncomeFormatted: '98.9901 ' + network1MarketplaceCoin.symbol,
          platformIncome: '0.9999',
          platformIncomeFormatted: '0.9999 ' + network1MarketplaceCoin.symbol,
          decimals: 18,
        },
      })

      user1Payout1 = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          amount: '0.1',
          amountFormatted: '0.1 ' + network1MarketplaceCoin.symbol,
          decimals: 18,
          cancelledAt: new Date(),
        },
      })

      user1Payout2 = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          amount: '0.2',
          amountFormatted: '0.2 ' + network1MarketplaceCoin.symbol,
          decimals: 18,
        },
      })

      user1Payout3 = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Coin.id,
          amount: '0.3',
          amountFormatted: '0.3 ' + network2MarketplaceCoin.symbol,
          decimals: 18,
          confirmedAt: new Date(),
        },
      })

      user1Payout4 = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          amount: '0.4',
          amountFormatted: '0.4 ' + network2MarketplaceToken.symbol,
          decimals: 18,
          pendingAt: new Date(),
        },
      })

      await prisma.sellerPayout.create({
        data: {
          sellerId: user2.id,
          sellerMarketplaceId: anotherUserMarketplace.id,
          sellerMarketplaceTokenId: anotherUserMarketplaceCoin.id,
          amount: '0.2',
          amountFormatted: '0.2 ' + network1MarketplaceCoin.symbol,
          decimals: 18,
        },
      })

      await prisma.sellerPayoutTransaction.create({
        data: {
          hash: '0xHASH4',
          sellerPayoutId: user1Payout3.id,
          networkId: network2.id,
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerPayoutTransaction.create({
        data: {
          hash: '0xHASH5',
          sellerPayoutId: user1Payout4.id,
          networkId: network2.id,
        },
      })
    })

    it('returns payouts', async () => {
      const userPayouts = await getUserPayouts({
        userId: user.id,
      })

      expect(userPayouts).toHaveLength(4)

      expect(userPayouts[0]).toEqual({
        id: user1Payout4.id,
        networkTitle: 'Network 2',
        amountFormatted: '0.4 TOKEN',
        status: 'awaiting_confirmation',
        date: user1Payout4.createdAt.toISOString(),
      })

      expect(userPayouts[1]).toEqual({
        id: user1Payout3.id,
        networkTitle: 'Network 2',
        amountFormatted: '0.3 COIN2',
        status: 'confirmed',
        date: user1Payout3.createdAt.toISOString(),
      })

      expect(userPayouts[2]).toEqual({
        id: user1Payout2.id,
        networkTitle: 'Network 1',
        amountFormatted: '0.2 COIN1',
        status: 'draft',
        date: user1Payout2.createdAt.toISOString(),
      })

      expect(userPayouts[3]).toEqual({
        id: user1Payout1.id,
        networkTitle: 'Network 1',
        amountFormatted: '0.1 COIN1',
        status: 'cancelled',
        date: user1Payout1.createdAt.toISOString(),
      })
    })
  })
})
