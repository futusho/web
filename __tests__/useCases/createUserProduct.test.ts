import { v4 as uuidv4 } from 'uuid'
import { parseUnits } from 'viem'
import { prisma } from '@/lib/prisma'
import {
  createUserProduct,
  InvalidProductPrice,
  ProductCategoryDoesNotExist,
  ProductPriceMustBePositive,
  TokenDoesNotExist,
  UserDoesNotExist,
} from '@/useCases/createUserProduct'
import { ClientError, UseCaseValidationError } from '@/useCases/errors'
import { cleanDatabase } from '../helpers'
import type {
  ProductCategory,
  SellerMarketplaceToken,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('createUserProduct', () => {
  const request = {
    userId: uuidv4(),
    userMarketplaceTokenId: uuidv4(),
    productCategoryId: uuidv4(),
    productTitle: 'Title',
    productDescription: 'Description',
    productPrice: '1232.9391929',
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await createUserProduct({
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
        await createUserProduct({
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
        await createUserProduct({
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

  describe('when productTitle is empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await createUserProduct({
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
        await createUserProduct({
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
        await createUserProduct({
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

  describe('when token does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserProduct({
          ...request,
          userId: user.id,
          userMarketplaceTokenId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(TokenDoesNotExist)
        expect((e as TokenDoesNotExist).message).toEqual('Token does not exist')
      }
    })
  })

  describe('when price is not a valid number', () => {
    let user: User, userMarketplaceToken: SellerMarketplaceToken

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
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserProduct({
          ...request,
          userId: user.id,
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
    let user: User, userMarketplaceToken: SellerMarketplaceToken

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
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserProduct({
          ...request,
          userId: user.id,
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
    let user: User, userMarketplaceToken: SellerMarketplaceToken

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
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserProduct({
          ...request,
          userId: user.id,
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
    let user: User, userMarketplaceToken: SellerMarketplaceToken

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
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await createUserProduct({
          ...request,
          userId: user.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
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

    describe('when price has 18 decimals', () => {
      it('creates a new product', async () => {
        await createUserProduct({
          userId: user.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productCategoryId: productCategory.id,
          productTitle: ' Product Title ',
          productDescription: ' Product Description ',
          productPrice: ' 1232.000000000009391929 ',
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            sellerId: user.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.slug).toEqual('product-title')
        expect(updatedUserProduct.title).toEqual('Product Title')
        expect(updatedUserProduct.description).toEqual('Product Description')
        expect(updatedUserProduct.content).toEqual('')
        expect(updatedUserProduct.priceFormatted).toEqual(
          '1232.000000000009391929 COIN'
        )
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual(
          '1232.000000000009391929'
        )
        expect(updatedUserProduct.publishedAt).toBeNull()

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1232000000000009391929n)
      })
    })

    describe('when price has 6 decimals', () => {
      it('creates a new product', async () => {
        await createUserProduct({
          userId: user.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productCategoryId: productCategory.id,
          productTitle: ' Product Title ',
          productDescription: ' Product Description ',
          productPrice: ' 1232.099919 ',
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            sellerId: user.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.slug).toEqual('product-title')
        expect(updatedUserProduct.title).toEqual('Product Title')
        expect(updatedUserProduct.description).toEqual('Product Description')
        expect(updatedUserProduct.content).toEqual('')
        expect(updatedUserProduct.priceFormatted).toEqual('1232.099919 COIN')
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual('1232.099919')
        expect(updatedUserProduct.publishedAt).toBeNull()

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1232099919000000000000n)
      })
    })

    describe('when price does not have decimals', () => {
      it('creates a new product', async () => {
        await createUserProduct({
          userId: user.id,
          userMarketplaceTokenId: userMarketplaceToken.id,
          productCategoryId: productCategory.id,
          productTitle: ' Product Title ',
          productDescription: ' Product Description ',
          productPrice: ' 1232 ',
        })

        const updatedUserProduct = await prisma.product.findFirst({
          where: {
            sellerId: user.id,
            sellerMarketplaceTokenId: userMarketplaceToken.id,
            categoryId: productCategory.id,
          },
        })

        if (!updatedUserProduct) {
          throw new Error('Unable to get user product')
        }

        expect(updatedUserProduct.slug).toEqual('product-title')
        expect(updatedUserProduct.title).toEqual('Product Title')
        expect(updatedUserProduct.description).toEqual('Product Description')
        expect(updatedUserProduct.content).toEqual('')
        expect(updatedUserProduct.priceFormatted).toEqual('1232 COIN')
        expect(updatedUserProduct.priceDecimals).toEqual(18)
        expect(updatedUserProduct.price.toString()).toEqual('1232')
        expect(updatedUserProduct.publishedAt).toBeNull()

        const priceInUnits = parseUnits(updatedUserProduct.price.toString(), 18)

        expect(priceInUnits).toEqual(1232000000000000000000n)
      })
    })
  })
})
