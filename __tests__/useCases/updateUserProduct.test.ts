import { v4 as uuidv4 } from 'uuid'
import { parseUnits } from 'viem'
import { prisma } from '@/lib/prisma'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import {
  updateUserProduct,
  InvalidProductPrice,
  ProductCategoryDoesNotExist,
  ProductPriceMustBePositive,
  TokenDoesNotExist,
  UserDoesNotExist,
  ProductDoesNotExist,
  ProductSlugIsAlreadyTaken,
} from '@/useCases/updateUserProduct'
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

describe('updateUserProduct', () => {
  const request = {
    productId: uuidv4(),
    userId: uuidv4(),
    userMarketplaceTokenId: uuidv4(),
    productCategoryId: uuidv4(),
    productSlug: 'new-product-slug',
    productTitle: 'New Product Title',
    productDescription: 'New Product Description',
    productContent: 'New Product Content',
    productPrice: '19.000000000009391929',
    attributes: [
      {
        key: ' Format ',
        value: ' PDF ',
      },
      {
        key: ' Number of Pages ',
        value: ' 42 ',
      },
      {
        key: ' Life-Time Access ',
        value: ' Yes ',
      },
    ],
    coverImageURLsToAdd: [],
    coverImageIdsToDelete: [],
    thumbnailImageURLsToAdd: [],
    thumbnailImageIdsToDelete: [],
  }

  describe('when productId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
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

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
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

  describe('when userMarketplaceTokenId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
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

  describe('when productCategoryId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
          ...request,
          productCategoryId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'productCategoryId: Invalid uuid',
        ])
      }
    })
  })

  describe('when productSlug is empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
          ...request,
          productSlug: ' ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'productSlug: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when productTitle is empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
          ...request,
          productTitle: ' ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'productTitle: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when productPrice is empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProduct({
          ...request,
          productPrice: ' ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'productPrice: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProduct({
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

  describe('when user product does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProduct({
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

  describe('when token does not exist', () => {
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
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
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
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(TokenDoesNotExist)
        expect((e as TokenDoesNotExist).message).toEqual('Token does not exist')
      }
    })
  })

  describe('when there are orders for the product', () => {
    it.todo('returns error')
  })

  describe('when price is not a valid number', () => {
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      userProduct: Product

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
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
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
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productPrice: 'zxc',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(InvalidProductPrice)
        expect((e as InvalidProductPrice).message).toEqual(
          'Invalid product price'
        )
      }
    })
  })

  describe('when price is a negative number', () => {
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      userProduct: Product

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
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
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
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productPrice: '-0.1',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductPriceMustBePositive)
        expect((e as ProductPriceMustBePositive).message).toEqual(
          'Product price must be positive'
        )
      }
    })
  })

  describe('when price is a zero', () => {
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      userProduct: Product

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
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
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
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productPrice: '0',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductPriceMustBePositive)
        expect((e as ProductPriceMustBePositive).message).toEqual(
          'Product price must be positive'
        )
      }
    })
  })

  describe('when product category does not exist', () => {
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      userProduct: Product

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
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
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
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productPrice: '0.1',
          productCategoryId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductCategoryDoesNotExist)
        expect((e as ProductCategoryDoesNotExist).message).toEqual(
          'Product category does not exist'
        )
      }
    })
  })

  describe('when product slug already used by another user product', () => {
    let user: User,
      userMarketplaceToken: SellerMarketplaceToken,
      userProduct: Product,
      newProductCategory: ProductCategory

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

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      newProductCategory = await prisma.productCategory.create({
        data: {
          slug: 'new-category',
          title: 'New Category',
          description: 'New Description',
        },
      })

      userProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
        },
      })

      await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          categoryId: productCategory.id,
          slug: 'another-product-title',
          title: 'Product Title 2',
          description: 'Product Description 2',
          content: '',
          price: '1.0',
          priceDecimals: 18,
          priceFormatted: '1.0 COIN',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProduct({
          ...request,
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productPrice: '0.1',
          productCategoryId: newProductCategory.id,
          productSlug: 'another-product-title',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(ProductSlugIsAlreadyTaken)
        expect((e as ProductSlugIsAlreadyTaken).message).toEqual(
          'Product slug is already taken'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User,
      newUserMarketplaceToken: SellerMarketplaceToken,
      newProductCategory: ProductCategory,
      userProduct: Product

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

      const networkMarketplaceCoin1 =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })

      const networkMarketplaceCoin2 =
        await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            smartContractAddress: '0xdeadbeef',
            symbol: 'NOCOIN',
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

      const userMarketplaceToken1 = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin1.id,
        },
      })

      newUserMarketplaceToken = await prisma.sellerMarketplaceToken.create({
        data: {
          sellerMarketplaceId: userMarketplace.id,
          networkMarketplaceTokenId: networkMarketplaceCoin2.id,
        },
      })

      const productCategory = await prisma.productCategory.create({
        data: {
          slug: 'category',
          title: 'Category',
          description: 'Description',
        },
      })

      newProductCategory = await prisma.productCategory.create({
        data: {
          slug: 'new-category',
          title: 'New Category',
          description: 'New Description',
        },
      })

      userProduct = await prisma.product.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceTokenId: userMarketplaceToken1.id,
          categoryId: productCategory.id,
          slug: 'product-title',
          title: 'Product Title',
          description: 'Product Description',
          content: '',
          price: '1233.093919290000000000',
          priceDecimals: 18,
          priceFormatted: '1233.09391929 COIN',
          attributes: [
            {
              key: 'Format',
              value: 'MOBI',
            },
          ],
        },
      })
    })

    describe('when price has 18 decimals', () => {
      it('updates the product', async () => {
        await updateUserProduct({
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: newUserMarketplaceToken.id,
          productCategoryId: newProductCategory.id,
          productSlug: 'new-product-slug',
          productTitle: ' New Product Title ',
          productDescription: ' New Product Description ',
          productContent: ' New Product Content ',
          productPrice: '1232.000000000009391929',
          attributes: [],
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            id: userProduct.id,
            sellerId: user.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.categoryId).toEqual(newProductCategory.id)
        expect(updatedUserProduct.sellerMarketplaceTokenId).toEqual(
          newUserMarketplaceToken.id
        )
        expect(updatedUserProduct.slug).toEqual('new-product-slug')
        expect(updatedUserProduct.title).toEqual('New Product Title')
        expect(updatedUserProduct.description).toEqual(
          'New Product Description'
        )
        expect(updatedUserProduct.content).toEqual('New Product Content')
        expect(updatedUserProduct.priceFormatted).toEqual(
          '1232.000000000009391929 NOCOIN'
        )
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual(
          '1232.000000000009391929'
        )
        expect(updatedUserProduct.publishedAt).not.toBeNull()
        expect(updatedUserProduct.attributes).toEqual([])

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1232000000000009391929n)
      })
    })

    describe('when price has 6 decimals', () => {
      it('updates the product', async () => {
        await updateUserProduct({
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: newUserMarketplaceToken.id,
          productCategoryId: newProductCategory.id,
          productSlug: 'new-product-slug',
          productTitle: ' New Product Title ',
          productDescription: ' New Product Description ',
          productContent: ' New Product Content ',
          productPrice: '1232.099919',
          attributes: [],
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            id: userProduct.id,
            sellerId: user.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.categoryId).toEqual(newProductCategory.id)
        expect(updatedUserProduct.sellerMarketplaceTokenId).toEqual(
          newUserMarketplaceToken.id
        )
        expect(updatedUserProduct.slug).toEqual('new-product-slug')
        expect(updatedUserProduct.title).toEqual('New Product Title')
        expect(updatedUserProduct.description).toEqual(
          'New Product Description'
        )
        expect(updatedUserProduct.content).toEqual('New Product Content')
        expect(updatedUserProduct.priceFormatted).toEqual('1232.099919 NOCOIN')
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual('1232.099919')
        expect(updatedUserProduct.publishedAt).not.toBeNull()
        expect(updatedUserProduct.attributes).toEqual([])

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1232099919000000000000n)
      })
    })

    describe('when price does not have decimals', () => {
      it('updates the product', async () => {
        await updateUserProduct({
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: newUserMarketplaceToken.id,
          productCategoryId: newProductCategory.id,
          productSlug: 'new-product-slug',
          productTitle: ' New Product Title ',
          productDescription: ' New Product Description ',
          productContent: ' New Product Content ',
          productPrice: '1239',
          attributes: [],
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            id: userProduct.id,
            sellerId: user.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.categoryId).toEqual(newProductCategory.id)
        expect(updatedUserProduct.sellerMarketplaceTokenId).toEqual(
          newUserMarketplaceToken.id
        )
        expect(updatedUserProduct.slug).toEqual('new-product-slug')
        expect(updatedUserProduct.title).toEqual('New Product Title')
        expect(updatedUserProduct.description).toEqual(
          'New Product Description'
        )
        expect(updatedUserProduct.content).toEqual('New Product Content')
        expect(updatedUserProduct.priceFormatted).toEqual('1239 NOCOIN')
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual('1239')
        expect(updatedUserProduct.publishedAt).not.toBeNull()
        expect(updatedUserProduct.attributes).toEqual([])

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1239000000000000000000n)
      })
    })

    describe('with attributes', () => {
      it('updates the product', async () => {
        await updateUserProduct({
          userId: user.id,
          productId: userProduct.id,
          userMarketplaceTokenId: newUserMarketplaceToken.id,
          productCategoryId: newProductCategory.id,
          productSlug: 'new-product-slug',
          productTitle: ' New Product Title ',
          productDescription: ' New Product Description ',
          productContent: ' New Product Content ',
          productPrice: '1239',
          attributes: [
            {
              key: ' Format ',
              value: ' PDF ',
            },
            {
              key: ' Pages ',
              value: ' 42 ',
            },
            {
              key: ' Life-Time Access ',
              value: ' Yes ',
            },
          ],
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            id: userProduct.id,
            sellerId: user.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.categoryId).toEqual(newProductCategory.id)
        expect(updatedUserProduct.sellerMarketplaceTokenId).toEqual(
          newUserMarketplaceToken.id
        )
        expect(updatedUserProduct.slug).toEqual('new-product-slug')
        expect(updatedUserProduct.title).toEqual('New Product Title')
        expect(updatedUserProduct.description).toEqual(
          'New Product Description'
        )
        expect(updatedUserProduct.content).toEqual('New Product Content')
        expect(updatedUserProduct.priceFormatted).toEqual('1239 NOCOIN')
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual('1239')
        expect(updatedUserProduct.publishedAt).not.toBeNull()
        expect(updatedUserProduct.attributes).toEqual([
          {
            key: 'Format',
            value: 'PDF',
          },
          {
            key: 'Pages',
            value: '42',
          },
          {
            key: 'Life-Time Access',
            value: 'Yes',
          },
        ])

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1239000000000000000000n)
      })
    })

    describe('when covers deletion requested', () => {
      it.todo('removes covers')
    })

    describe('when thumbnails deletion requested', () => {
      it.todo('removes thumbnails')
    })

    describe('when covers added', () => {
      it.todo('adds covers')
    })

    describe('when thumbnails added', () => {
      it.todo('adds thumbnails')
    })
  })
})
