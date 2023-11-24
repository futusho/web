import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getSellerProductShowcase,
  SellerDoesNotExist,
  ProductDoesNotExist,
} from '@/useCases/getSellerProductShowcase'
import { cleanDatabase } from '../helpers'
import type { Product, User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getSellerProductShowcase', () => {
  const request = {
    sellerUsername: 'username',
    productSlug: 'product-slug',
  }

  describe('when username is an empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getSellerProductShowcase({
          ...request,
          sellerUsername: ' ',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'sellerUsername: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when product slug is an empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getSellerProductShowcase({
          ...request,
          productSlug: ' ',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'productSlug: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getSellerProductShowcase({
          ...request,
          sellerUsername: 'does-not-exist',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(SellerDoesNotExist)
        expect((e as SellerDoesNotExist).message).toEqual(
          'Seller does not exist'
        )
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
        const result = await getSellerProductShowcase({
          ...request,
          sellerUsername: user.username,
          productSlug: 'does-not-exist',
        })

        expect(result).toBeNull()
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
    let user: User, userProduct: Product

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
          confirmedAt: new Date(),
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

      userProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-slug',
          title: 'Product Title 1',
          description: 'Product Description 1',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getSellerProductShowcase({
          ...request,
          sellerUsername: user.username,
          productSlug: userProduct.slug,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductDoesNotExist)
        expect((e as ProductDoesNotExist).message).toEqual(
          'Product does not exist'
        )
      }
    })
  })

  describe('when seller marketplace is not confirmed', () => {
    let user: User, userProduct: Product

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

      userProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-slug',
          title: 'Product Title 1',
          description: 'Product Description 1',
          content: '',
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
        const result = await getSellerProductShowcase({
          ...request,
          sellerUsername: user.username,
          productSlug: userProduct.slug,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductDoesNotExist)
        expect((e as ProductDoesNotExist).message).toEqual(
          'Product does not exist'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User, userProduct: Product

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          username: 'username',
          name: 'Seller Name',
        },
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
          confirmedAt: new Date(),
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

      userProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-slug',
          title: 'Product Title',
          description: 'Product Description',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          publishedAt: new Date(),
          attributes: [
            {
              key: 'Format',
              value: 'PDF',
            },
            {
              key: 'Pages',
              value: '42',
            },
          ],
        },
      })
    })

    describe('when product does not have images', () => {
      it('returns seller product showcase', async () => {
        const result = await getSellerProductShowcase({
          sellerUsername: ' USERNAME ',
          productSlug: ' PRODUCT-SLUG ',
        })

        expect(result).toBeDefined()

        expect(result.product).toEqual({
          id: userProduct.id,
          title: 'Product Title',
          description: 'Product Description',
          priceFormatted: '1233.09391929 COIN',
          networkTitle: 'Network',
          covers: [],
          attributes: [
            {
              key: 'Format',
              value: 'PDF',
            },
            {
              key: 'Pages',
              value: '42',
            },
          ],
        })

        expect(result.seller).toEqual({
          displayName: 'Seller Name',
          profileURL: '/u/username',
          avatarURL: '/avatar-placeholder.png',
        })
      })
    })

    describe('when product does not have images', () => {
      beforeEach(async () => {
        await prisma.productImage.createMany({
          data: [
            {
              productId: userProduct.id,
              type: 'cover',
              url: '/product-cover1.png',
            },
            {
              productId: userProduct.id,
              type: 'cover',
              url: '/product-cover2.png',
            },
            {
              productId: userProduct.id,
              type: 'thumbnail',
              url: '/product-thumbnail.png',
            },
          ],
        })
      })

      it('returns seller product showcase', async () => {
        const result = await getSellerProductShowcase({
          sellerUsername: ' USERNAME ',
          productSlug: ' PRODUCT-SLUG ',
        })

        expect(result).toBeDefined()

        expect(result.product).toEqual({
          id: userProduct.id,
          title: 'Product Title',
          description: 'Product Description',
          priceFormatted: '1233.09391929 COIN',
          networkTitle: 'Network',
          covers: ['/product-cover1.png', '/product-cover2.png'],
          attributes: [
            {
              key: 'Format',
              value: 'PDF',
            },
            {
              key: 'Pages',
              value: '42',
            },
          ],
        })

        expect(result.seller).toEqual({
          displayName: 'Seller Name',
          profileURL: '/u/username',
          avatarURL: '/avatar-placeholder.png',
        })
      })
    })
  })
})
