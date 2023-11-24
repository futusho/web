import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  getUserProductDetailsForEdit,
  UserDoesNotExist,
  ProductDoesNotExist,
} from '@/useCases/getUserProductDetailsForEdit'
import { cleanDatabase } from '../helpers'
import type {
  Product,
  ProductCategory,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserProductDetailsForEdit', () => {
  const request = {
    userId: uuidv4(),
    userProductId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProductDetailsForEdit({
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

  describe('when userProductId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProductDetailsForEdit({
          ...request,
          userProductId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userProductId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProductDetailsForEdit({
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
        const result = await getUserProductDetailsForEdit({
          ...request,
          userId: user.id,
          userProductId: uuidv4(),
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
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      productCategory: ProductCategory

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

      userMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin.id,
        },
      })

      productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })
    })

    describe('when attributes are set', () => {
      let userProduct: Product

      beforeEach(async () => {
        userProduct = await prisma.product.create({
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
            attributes: [
              {
                key: 'Format',
                value: 'PDF',
              },
            ],
          },
        })
      })

      it('returns user product', async () => {
        const userProductDetails = await getUserProductDetailsForEdit({
          userId: user.id,
          userProductId: userProduct.id,
        })

        expect(userProductDetails.id).toEqual(userProduct.id)
        expect(userProductDetails.userMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(userProductDetails.productCategoryId).toEqual(productCategory.id)
        expect(userProductDetails.slug).toEqual('product-title')
        expect(userProductDetails.title).toEqual('Product Title')
        expect(userProductDetails.description).toEqual('Product Description')
        expect(userProductDetails.content).toEqual('Product Content')
        expect(userProductDetails.price).toEqual('1233.09391929')
        expect(userProductDetails.attributes).toEqual([
          {
            key: 'Format',
            value: 'PDF',
          },
        ])
        expect(userProductDetails.coverImages).toEqual([])
        expect(userProductDetails.thumbnailImages).toEqual([])
      })
    })

    describe('when attributes are null', () => {
      let userProduct: Product

      beforeEach(async () => {
        userProduct = await prisma.product.create({
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

      it('returns user product', async () => {
        const userProductDetails = await getUserProductDetailsForEdit({
          userId: user.id,
          userProductId: userProduct.id,
        })

        expect(userProductDetails.id).toEqual(userProduct.id)
        expect(userProductDetails.userMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(userProductDetails.productCategoryId).toEqual(productCategory.id)
        expect(userProductDetails.slug).toEqual('product-title')
        expect(userProductDetails.title).toEqual('Product Title')
        expect(userProductDetails.description).toEqual('Product Description')
        expect(userProductDetails.content).toEqual('Product Content')
        expect(userProductDetails.price).toEqual('1233.09391929')
        expect(userProductDetails.attributes).toEqual([])
        expect(userProductDetails.coverImages).toEqual([])
        expect(userProductDetails.thumbnailImages).toEqual([])
      })
    })

    describe('when attributes are null', () => {
      let userProduct: Product

      beforeEach(async () => {
        userProduct = await prisma.product.create({
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
            attributes: [],
          },
        })
      })

      it('returns user product', async () => {
        const userProductDetails = await getUserProductDetailsForEdit({
          userId: user.id,
          userProductId: userProduct.id,
        })

        expect(userProductDetails.id).toEqual(userProduct.id)
        expect(userProductDetails.userMarketplaceTokenId).toEqual(
          userMarketplaceToken.id
        )
        expect(userProductDetails.productCategoryId).toEqual(productCategory.id)
        expect(userProductDetails.slug).toEqual('product-title')
        expect(userProductDetails.title).toEqual('Product Title')
        expect(userProductDetails.description).toEqual('Product Description')
        expect(userProductDetails.content).toEqual('Product Content')
        expect(userProductDetails.price).toEqual('1233.09391929')
        expect(userProductDetails.attributes).toEqual([])
        expect(userProductDetails.coverImages).toEqual([])
        expect(userProductDetails.thumbnailImages).toEqual([])
      })
    })
  })
})
