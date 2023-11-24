import { v4 as uuidv4 } from 'uuid'
import { parseUnits } from 'viem'
import { prisma } from '@/lib/prisma'
import {
  createProductOrder,
  ProductDoesNotExist,
  ProductDoesNotHaveContent,
  SellerMarketplaceDoesNotHaveOwnerWalletAddress,
  SellerMarketplaceDoesNotHaveSmartContractAddress,
  SellerMarketplaceIsNotConfirmed,
  UnpaidOrderExists,
  UserDoesNotExist,
} from '@/useCases/createProductOrder'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  Product,
  SellerMarketplace,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('createProductOrder', () => {
  const request = {
    userId: uuidv4(),
    productId: uuidv4(),
  }

  describe('useCase validations', () => {
    describe('when userId is not a valid uuid', () => {
      it('returns error', async () => {
        expect.assertions(2)

        try {
          await createProductOrder({
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

    describe('when productId is not a valid uuid', () => {
      it('returns error', async () => {
        expect.assertions(2)

        try {
          await createProductOrder({
            ...request,
            productId: 'not-an-uuid',
          })
        } catch (e) {
          expect(e).toBeInstanceOf(UseCaseValidationError)
          expect((e as UseCaseValidationError).errors).toEqual([
            'productId: Invalid uuid',
          ])
        }
      })
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
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

  describe('when product does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductDoesNotExist)
        expect((e as ProductDoesNotExist).message).toEqual(
          'Product does not exist'
        )
      }
    })
  })

  describe('when product is not published', () => {
    let user: User, product: Product

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
          smartContractAddress: '',
          ownerWalletAddress: '',
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
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductDoesNotExist)
        expect((e as ProductDoesNotExist).message).toEqual(
          'Product does not exist'
        )
      }
    })
  })

  describe('when product does not have a content', () => {
    let user: User, product: Product

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
          smartContractAddress: '',
          ownerWalletAddress: '',
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

      product = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
          content: ' ',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          publishedAt: new Date(),
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(ProductDoesNotHaveContent)
        expect((e as ProductDoesNotHaveContent).message).toEqual(
          'Product does not have a content'
        )
      }
    })
  })

  describe('when product is published but user marketplace is not confirmed', () => {
    let user: User, product: Product

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
          smartContractAddress: '',
          ownerWalletAddress: '',
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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(SellerMarketplaceIsNotConfirmed)
        expect((e as SellerMarketplaceIsNotConfirmed).message).toEqual(
          'Seller marketplace is not confirmed'
        )
      }
    })
  })

  describe('when product is published but user marketplace does not have smart contract address', () => {
    let user: User, product: Product

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
          smartContractAddress: '',
          ownerWalletAddress: '',
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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(
          SellerMarketplaceDoesNotHaveSmartContractAddress
        )
        expect(
          (e as SellerMarketplaceDoesNotHaveSmartContractAddress).message
        ).toEqual('Seller marketplace does not have a smart contract address')
      }
    })
  })

  describe('when product is published but user marketplace does not have an owner wallet address', () => {
    let user: User, product: Product

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
          ownerWalletAddress: '',
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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(SellerMarketplaceDoesNotHaveOwnerWalletAddress)
        expect(
          (e as SellerMarketplaceDoesNotHaveOwnerWalletAddress).message
        ).toEqual('Seller marketplace does not have an owner wallet address')
      }
    })
  })

  describe('when there is unpaid order for this product', () => {
    let user: User, product: Product

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

      await prisma.productOrder.create({
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
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictError)
        expect(e).toBeInstanceOf(UnpaidOrderExists)
        expect((e as UnpaidOrderExists).message).toEqual(
          'Unpaid order exists. Please pay or cancel the order'
        )
      }
    })
  })

  describe('when everything is great', () => {
    let user: User,
      product: Product,
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

    describe('when there is cancelled order', () => {
      beforeEach(async () => {
        await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1232.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1232.09391929 COIN',
            cancelledAt: new Date(),
          },
        })
      })

      it('creates a new order', async () => {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })

        const createdUserProductOrder = await prisma.productOrder.findFirst({
          where: {
            buyerId: user.id,
            productId: product.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (!createdUserProductOrder) {
          throw new Error('Unable to get user product order')
        }

        expect(createdUserProductOrder.sellerMarketplaceId).toEqual(
          userMarketplace.id
        )
        expect(createdUserProductOrder.sellerMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(createdUserProductOrder.sellerWalletAddress).toEqual('0xWALLET')
        expect(createdUserProductOrder.priceFormatted).toEqual(
          '1233.09391929 COIN'
        )
        expect(createdUserProductOrder.priceDecimals).toEqual(18)
        expect(createdUserProductOrder.price.toString()).toEqual(
          '1233.09391929'
        )
        expect(createdUserProductOrder.pendingAt).toBeNull()
        expect(createdUserProductOrder.confirmedAt).toBeNull()
        expect(createdUserProductOrder.cancelledAt).toBeNull()
        expect(createdUserProductOrder.refundedAt).toBeNull()

        const priceInUnits = parseUnits(
          createdUserProductOrder.price.toString(),
          18
        )

        expect(priceInUnits).toEqual(1233093919290000000000n)
      })
    })

    describe('when there is confirmed order', () => {
      beforeEach(async () => {
        await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1232.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1232.09391929 COIN',
            confirmedAt: new Date(),
          },
        })
      })

      it('creates a new order', async () => {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })

        const createdUserProductOrder = await prisma.productOrder.findFirst({
          where: {
            buyerId: user.id,
            productId: product.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (!createdUserProductOrder) {
          throw new Error('Unable to get user product order')
        }

        expect(createdUserProductOrder.sellerMarketplaceId).toEqual(
          userMarketplace.id
        )
        expect(createdUserProductOrder.sellerMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(createdUserProductOrder.sellerWalletAddress).toEqual('0xWALLET')
        expect(createdUserProductOrder.priceFormatted).toEqual(
          '1233.09391929 COIN'
        )
        expect(createdUserProductOrder.priceDecimals).toEqual(18)
        expect(createdUserProductOrder.price.toString()).toEqual(
          '1233.09391929'
        )
        expect(createdUserProductOrder.pendingAt).toBeNull()
        expect(createdUserProductOrder.confirmedAt).toBeNull()
        expect(createdUserProductOrder.cancelledAt).toBeNull()
        expect(createdUserProductOrder.refundedAt).toBeNull()

        const priceInUnits = parseUnits(
          createdUserProductOrder.price.toString(),
          18
        )

        expect(priceInUnits).toEqual(1233093919290000000000n)
      })
    })

    describe('when there is refunded order', () => {
      beforeEach(async () => {
        await prisma.productOrder.create({
          data: {
            buyerId: user.id,
            productId: product.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            sellerWalletAddress: '0xWALLET',
            price: '1232.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1232.09391929 COIN',
            refundedAt: new Date(),
          },
        })
      })

      it('creates a new order', async () => {
        await createProductOrder({
          ...request,
          userId: user.id,
          productId: product.id,
        })

        const createdUserProductOrder = await prisma.productOrder.findFirst({
          where: {
            buyerId: user.id,
            productId: product.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (!createdUserProductOrder) {
          throw new Error('Unable to get user product order')
        }

        expect(createdUserProductOrder.sellerMarketplaceId).toEqual(
          userMarketplace.id
        )
        expect(createdUserProductOrder.sellerMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(createdUserProductOrder.sellerWalletAddress).toEqual('0xWALLET')
        expect(createdUserProductOrder.priceFormatted).toEqual(
          '1233.09391929 COIN'
        )
        expect(createdUserProductOrder.priceDecimals).toEqual(18)
        expect(createdUserProductOrder.price.toString()).toEqual(
          '1233.09391929'
        )
        expect(createdUserProductOrder.pendingAt).toBeNull()
        expect(createdUserProductOrder.confirmedAt).toBeNull()
        expect(createdUserProductOrder.cancelledAt).toBeNull()
        expect(createdUserProductOrder.refundedAt).toBeNull()

        const priceInUnits = parseUnits(
          createdUserProductOrder.price.toString(),
          18
        )

        expect(priceInUnits).toEqual(1233093919290000000000n)
      })
    })
  })
})
