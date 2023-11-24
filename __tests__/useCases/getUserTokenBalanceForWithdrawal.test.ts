import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getUserTokenBalanceForWithdrawal,
  UserDoesNotExist,
} from '@/useCases/getUserTokenBalanceForWithdrawal'
import { cleanDatabase } from '../helpers'
import type {
  SellerMarketplace,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserTokenBalanceForWithdrawal', () => {
  const request = {
    userId: uuidv4(),
  }

  describe('useCase validations', () => {
    describe('when userId is not a valid uuid', () => {
      it('returns error', async () => {
        expect.assertions(2)

        try {
          await getUserTokenBalanceForWithdrawal({
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
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await getUserTokenBalanceForWithdrawal({
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

  describe('when requested by another user', () => {
    let anotherUser: User

    beforeEach(async () => {
      anotherUser = await prisma.user.create({
        data: {},
      })

      const user = await prisma.user.create({
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
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      const userMarketplaceCoin = await prisma.sellerMarketplaceToken.create({
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

      const product1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          categoryId: productCategory.id,
          slug: 'product-title-1',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0099919',
          priceDecimals: 18,
          priceFormatted: '0.0099919 COIN',
          publishedAt: new Date(),
        },
      })

      const userProduct1Order = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product1.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          sellerWalletAddress: '0xWALLET',
          price: product1.price,
          priceDecimals: product1.priceDecimals,
          priceFormatted: product1.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProduct1Order.id,
            networkId: network.id,
            hash: '0xHASH1',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product1.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '0.009692143',
          sellerIncomeFormatted: '0.009692143 COIN',
          platformIncome: '0.000299757',
          platformIncomeFormatted: '0.000299757 COIN',
          decimals: 18,
        },
      })
    })

    it('returns an empty array', async () => {
      const result = await getUserTokenBalanceForWithdrawal({
        ...request,
        userId: anotherUser.id,
      })

      expect(result).toEqual([])
    })
  })

  describe('without sales', () => {
    let user: User

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
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      const userMarketplaceCoin = await prisma.sellerMarketplaceToken.create({
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
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          categoryId: productCategory.id,
          slug: 'product-title-1',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0099919',
          priceDecimals: 18,
          priceFormatted: '0.0099919 COIN',
          publishedAt: new Date(),
        },
      })

      const userProductOrder = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          sellerWalletAddress: '0xWALLET',
          price: product.price,
          priceDecimals: product.priceDecimals,
          priceFormatted: product.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      await prisma.productOrderTransaction.create({
        data: {
          productOrderId: userProductOrder.id,
          networkId: network.id,
          hash: '0xHASH1',
          confirmedAt: new Date(),
        },
      })
    })

    it('returns an empty array', async () => {
      const tokens = await getUserTokenBalanceForWithdrawal({
        ...request,
        userId: user.id,
      })

      expect(tokens).toEqual([])
    })
  })

  describe('without payouts', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceCoin: SellerMarketplaceToken

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
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      userMarketplaceCoin = await prisma.sellerMarketplaceToken.create({
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
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          categoryId: productCategory.id,
          slug: 'product-title-1',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0099919',
          priceDecimals: 18,
          priceFormatted: '0.0099919 COIN',
          publishedAt: new Date(),
        },
      })

      const userProductOrder = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          sellerWalletAddress: '0xWALLET',
          price: product.price,
          priceDecimals: product.priceDecimals,
          priceFormatted: product.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH1',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '0.009692143',
          sellerIncomeFormatted: '0.009692143 COIN',
          platformIncome: '0.000299757',
          platformIncomeFormatted: '0.000299757 COIN',
          decimals: 18,
        },
      })
    })

    it('returns coin balance', async () => {
      const tokens = await getUserTokenBalanceForWithdrawal({
        ...request,
        userId: user.id,
      })

      expect(tokens).toHaveLength(1)

      const _userMarketplaceCoin = tokens.find(
        (token) => token.userMarketplaceTokenId === userMarketplaceCoin.id
      )

      expect(_userMarketplaceCoin).toEqual({
        userMarketplaceId: userMarketplace.id,
        userMarketplaceTokenId: userMarketplaceCoin.id,
        amountFormatted: '0.009692143 COIN',
        networkTitle: 'Network',
        marketplaceSmartContractAddress: '0xMARKETPLACE',
        tokenSmartContractAddress: null,
      })
    })
  })

  describe('with payouts', () => {
    let user: User,
      userMarketplace: SellerMarketplace,
      userMarketplaceCoin: SellerMarketplaceToken

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
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      userMarketplaceCoin = await prisma.sellerMarketplaceToken.create({
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
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          categoryId: productCategory.id,
          slug: 'product-title-1',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0099919',
          priceDecimals: 18,
          priceFormatted: '0.0099919 COIN',
          publishedAt: new Date(),
        },
      })

      const userProductOrder = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          sellerWalletAddress: '0xWALLET',
          price: product.price,
          priceDecimals: product.priceDecimals,
          priceFormatted: product.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProductOrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProductOrder.id,
            networkId: network.id,
            hash: '0xHASH1',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          productOrderTransactionId: userProductOrderTransaction.id,
          sellerIncome: '0.009692143',
          sellerIncomeFormatted: '0.009692143 COIN',
          platformIncome: '0.000299757',
          platformIncomeFormatted: '0.000299757 COIN',
          decimals: 18,
        },
      })
    })

    describe('with draft payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '0.009692143',
            amountFormatted: '0.009692143 COIN',
            decimals: 18,
          },
        })
      })

      it('returns empty coin balance', async () => {
        const tokens = await getUserTokenBalanceForWithdrawal({
          ...request,
          userId: user.id,
        })

        expect(tokens).toHaveLength(1)

        const _userMarketplaceCoin = tokens.find(
          (token) => token.userMarketplaceTokenId === userMarketplaceCoin.id
        )

        expect(_userMarketplaceCoin).toEqual({
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceCoin.id,
          amountFormatted: '0 COIN',
          networkTitle: 'Network',
          marketplaceSmartContractAddress: '0xMARKETPLACE',
          tokenSmartContractAddress: null,
        })
      })
    })

    describe('with pending payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '0.009692143',
            amountFormatted: '0.009692143 COIN',
            decimals: 18,
            pendingAt: new Date(),
          },
        })
      })

      it('returns empty coin balance', async () => {
        const tokens = await getUserTokenBalanceForWithdrawal({
          ...request,
          userId: user.id,
        })

        expect(tokens).toHaveLength(1)

        const _userMarketplaceCoin = tokens.find(
          (token) => token.userMarketplaceTokenId === userMarketplaceCoin.id
        )

        expect(_userMarketplaceCoin).toEqual({
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceCoin.id,
          amountFormatted: '0 COIN',
          networkTitle: 'Network',
          marketplaceSmartContractAddress: '0xMARKETPLACE',
          tokenSmartContractAddress: null,
        })
      })
    })

    describe('with cancelled payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '0.009692143',
            amountFormatted: '0.009692143 COIN',
            decimals: 18,
            cancelledAt: new Date(),
          },
        })
      })

      it('returns coin balance', async () => {
        const tokens = await getUserTokenBalanceForWithdrawal({
          ...request,
          userId: user.id,
        })

        expect(tokens).toHaveLength(1)

        const _userMarketplaceCoin = tokens.find(
          (token) => token.userMarketplaceTokenId === userMarketplaceCoin.id
        )

        expect(_userMarketplaceCoin).toEqual({
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceCoin.id,
          amountFormatted: '0.009692143 COIN',
          networkTitle: 'Network',
          marketplaceSmartContractAddress: '0xMARKETPLACE',
          tokenSmartContractAddress: null,
        })
      })
    })

    describe('with confirmed payout', () => {
      beforeEach(async () => {
        await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '0.009692143',
            amountFormatted: '0.009692143 COIN',
            decimals: 18,
            confirmedAt: new Date(),
          },
        })
      })

      it('returns empty coin balance', async () => {
        const tokens = await getUserTokenBalanceForWithdrawal({
          ...request,
          userId: user.id,
        })

        expect(tokens).toHaveLength(1)

        const _userMarketplaceCoin = tokens.find(
          (token) => token.userMarketplaceTokenId === userMarketplaceCoin.id
        )

        expect(_userMarketplaceCoin).toEqual({
          userMarketplaceId: userMarketplace.id,
          userMarketplaceTokenId: userMarketplaceCoin.id,
          amountFormatted: '0 COIN',
          networkTitle: 'Network',
          marketplaceSmartContractAddress: '0xMARKETPLACE',
          tokenSmartContractAddress: null,
        })
      })
    })
  })

  describe('with multiple payouts', () => {
    let user: User,
      userMarketplace1: SellerMarketplace,
      userMarketplace2: SellerMarketplace,
      userMarketplace1Coin: SellerMarketplaceToken,
      userMarketplace1Token: SellerMarketplaceToken,
      userMarketplace2Token: SellerMarketplaceToken

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

      const networkMarketplaceToken =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'TOKEN',
            smartContractAddress: '0xTOKEN',
          },
        })

      userMarketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      userMarketplace2 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      userMarketplace1Coin = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace1.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      userMarketplace1Token = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace1.id,
          networkMarketplaceTokenId: networkMarketplaceToken.id,
        },
      })

      await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace2.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      userMarketplace2Token = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace2.id,
          networkMarketplaceTokenId: networkMarketplaceToken.id,
        },
      })

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      const product1 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          categoryId: productCategory.id,
          slug: 'product-title-1',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0099919',
          priceDecimals: 18,
          priceFormatted: '0.0099919 COIN',
          publishedAt: new Date(),
        },
      })

      const userProduct1Order = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product1.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          sellerWalletAddress: '0xWALLET',
          price: product1.price,
          priceDecimals: product1.priceDecimals,
          priceFormatted: product1.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProduct1OrderTransaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProduct1Order.id,
            networkId: network.id,
            hash: '0xHASH1',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product1.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace1Coin.id,
          productOrderTransactionId: userProduct1OrderTransaction.id,
          sellerIncome: '0.009692143',
          sellerIncomeFormatted: '0.009692143 COIN',
          platformIncome: '0.000299757',
          platformIncomeFormatted: '0.000299757 COIN',
          decimals: 18,
        },
      })

      const product2 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace1Token.id,
          categoryId: productCategory.id,
          slug: 'product-title-2',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.000042',
          priceDecimals: 18,
          priceFormatted: '0.000042 TOKEN',
          publishedAt: new Date(),
        },
      })

      await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product2.id,
          sellerMarketplaceId: userMarketplace1.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          sellerWalletAddress: '0xWALLET',
          price: product2.price,
          priceDecimals: product2.priceDecimals,
          priceFormatted: product2.priceFormatted,
          cancelledAt: new Date(),
        },
      })

      const product3 = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          categoryId: productCategory.id,
          slug: 'product-title-3',
          title: 'Product Title',
          description: 'Product Description',
          content: 'Product Content',
          price: '0.0042',
          priceDecimals: 18,
          priceFormatted: '0.0042 TOKEN',
          publishedAt: new Date(),
        },
      })

      const userProduct3Order1 = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          sellerWalletAddress: '0xWALLET',
          price: product3.price,
          priceDecimals: product3.priceDecimals,
          priceFormatted: product3.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProduct3Order1Transaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProduct3Order1.id,
            networkId: network.id,
            hash: '0xHASH2',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          productOrderTransactionId: userProduct3Order1Transaction.id,
          sellerIncome: '0.004074',
          sellerIncomeFormatted: '0.004074 TOKEN',
          platformIncome: '0.000126',
          platformIncomeFormatted: '0.000126 TOKEN',
          decimals: 18,
        },
      })

      await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          amount: '0.004074',
          amountFormatted: '0.004074 TOKEN',
          decimals: 18,
          confirmedAt: new Date(),
        },
      })

      const userProduct3Order2 = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          sellerWalletAddress: '0xWALLET',
          price: product3.price,
          priceDecimals: product3.priceDecimals,
          priceFormatted: product3.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProduct3Order2Transaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProduct3Order2.id,
            networkId: network.id,
            hash: '0xHASH3',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: product3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          productOrderTransactionId: userProduct3Order2Transaction.id,
          sellerIncome: '0.004074',
          sellerIncomeFormatted: '0.004074 TOKEN',
          platformIncome: '0.000126',
          platformIncomeFormatted: '0.000126 TOKEN',
          decimals: 18,
        },
      })

      const updatedProduct3 = await prisma.product.update({
        where: {
          id: product3.id,
        },
        data: {
          price: '0.0033',
          priceFormatted: '0.0033 TOKEN',
        },
      })

      const userProduct3Order3 = await prisma.productOrder.create({
        data: {
          buyerId: user.id,
          productId: updatedProduct3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          sellerWalletAddress: '0xWALLET',
          price: updatedProduct3.price,
          priceDecimals: updatedProduct3.priceDecimals,
          priceFormatted: updatedProduct3.priceFormatted,
          confirmedAt: new Date(),
        },
      })

      const userProduct3Order3Transaction =
        await prisma.productOrderTransaction.create({
          data: {
            productOrderId: userProduct3Order3.id,
            networkId: network.id,
            hash: '0xHASH4',
            confirmedAt: new Date(),
          },
        })

      await prisma.productSale.create({
        data: {
          sellerId: user.id,
          productId: updatedProduct3.id,
          sellerMarketplaceId: userMarketplace2.id,
          sellerMarketplaceTokenId: userMarketplace2Token.id,
          productOrderTransactionId: userProduct3Order3Transaction.id,
          sellerIncome: '0.003201',
          sellerIncomeFormatted: '0.003201 TOKEN',
          platformIncome: '0.000099',
          platformIncomeFormatted: '0.000099 TOKEN',
          decimals: 18,
        },
      })
    })

    it('returns token and coin balances', async () => {
      const tokens = await getUserTokenBalanceForWithdrawal({
        ...request,
        userId: user.id,
      })

      expect(tokens).toHaveLength(2)

      const _userMarketplace1Coin = tokens.find(
        (token) => token.userMarketplaceTokenId === userMarketplace1Coin.id
      )

      expect(_userMarketplace1Coin).toEqual({
        userMarketplaceId: userMarketplace1.id,
        userMarketplaceTokenId: userMarketplace1Coin.id,
        amountFormatted: '0.009692143 COIN',
        networkTitle: 'Network',
        marketplaceSmartContractAddress: '0xMARKETPLACE',
        tokenSmartContractAddress: null,
      })

      const _userMarketplace2Token = tokens.find(
        (token) => token.userMarketplaceTokenId === userMarketplace2Token.id
      )

      expect(_userMarketplace2Token).toEqual({
        userMarketplaceId: userMarketplace2.id,
        userMarketplaceTokenId: userMarketplace2Token.id,
        amountFormatted: '0.007275 TOKEN',
        networkTitle: 'Network',
        marketplaceSmartContractAddress: '0xMARKETPLACE',
        tokenSmartContractAddress: '0xTOKEN',
      })
    })
  })
})
