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
  getUserProductOrderBasedOnStatus,
  OrderDoesNotExist,
  PendingOrderMustHaveTransactions,
  PendingOrderMustNotHaveConfirmedTransactions,
  RefundedOrderDoesNotHaveConfirmedTransaction,
  SellerMarketplaceDoesNotHaveValidOwnerWalletAddress,
  SellerMarketplaceDoesNotHaveValidSmartContractAddress,
  UserDoesNotExist,
} from '@/useCases/getUserProductOrderBasedOnStatus'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  NetworkMarketplace,
  NetworkMarketplaceToken,
  ProductOrder,
  ProductOrderTransaction,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserProductOrderBasedOnStatus', () => {
  const request = {
    userId: uuidv4(),
    userProductOrderId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProductOrderBasedOnStatus({
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

  describe('when userProductOrderId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProductOrderBasedOnStatus({
          ...request,
          userProductOrderId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userProductOrderId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProductOrderBasedOnStatus({
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

  describe('when order does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProductOrderBasedOnStatus({
          ...request,
          userId: user.id,
          userProductOrderId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(OrderDoesNotExist)
        expect((e as OrderDoesNotExist).message).toEqual('Order does not exist')
      }
    })
  })

  describe('when requested order belongs to another user', () => {
    let user: User, anotherUserProductOrder: ProductOrder

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

      anotherUserProductOrder = await prisma.productOrder.create({
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

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProductOrderBasedOnStatus({
          ...request,
          userId: user.id,
          userProductOrderId: anotherUserProductOrder.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(OrderDoesNotExist)
        expect((e as OrderDoesNotExist).message).toEqual('Order does not exist')
      }
    })
  })

  describe('when seller marketplace is not confirmed', () => {
    it.todo('returns error')
  })

  describe('when order is draft', () => {
    let user: User, network: Network, networkMarketplace: NetworkMarketplace

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          name: 'Seller',
          username: 'nickname',
        },
      })

      network = await prisma.network.create({
        data: {
          title: 'Network',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xDEADBEEF',
          commissionRate: 1,
        },
      })
    })

    describe('when there are transactions', () => {
      let userProductOrder: ProductOrder

      beforeEach(async () => {
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
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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

    describe('when payment method is coin', () => {
      let networkMarketplaceCoin: NetworkMarketplaceToken

      beforeEach(async () => {
        networkMarketplaceCoin = await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'COIN',
          },
        })
      })

      describe('when seller marketplace does not have valid owner wallet address', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xDEADBEEF',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrderBasedOnStatus({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              SellerMarketplaceDoesNotHaveValidOwnerWalletAddress
            )
            expect(
              (e as SellerMarketplaceDoesNotHaveValidOwnerWalletAddress).message
            ).toEqual(
              'Seller marketplace does not have valid owner wallet address'
            )
          }
        })
      })

      describe('when seller marketplace does not have valid smart contract address', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress: '0xDEADBEEF',
              ownerWalletAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrderBasedOnStatus({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              SellerMarketplaceDoesNotHaveValidSmartContractAddress
            )
            expect(
              (e as SellerMarketplaceDoesNotHaveValidSmartContractAddress)
                .message
            ).toEqual(
              'Seller marketplace does not have valid smart contract address'
            )
          }
        })
      })

      describe('when everything is good', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
            },
          })
        })

        it('returns draft order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            priceFormatted: '1234.09391929 COIN',
            priceInCoins: '1234093919290000000000',
            networkChainId: 1,
            networkTitle: 'Network',
            networkBlockchainExplorerURL: 'https://localhost',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            sellerDisplayName: 'Seller',
            sellerUsername: 'nickname',
          })
        })
      })
    })

    describe('when payment method is ERC20 token', () => {
      let networkMarketplaceToken: NetworkMarketplaceToken

      beforeEach(async () => {
        networkMarketplaceToken = await prisma.networkMarketplaceToken.create({
          data: {
            marketplaceId: networkMarketplace.id,
            decimals: 18,
            symbol: 'TOKEN',
            smartContractAddress: '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
          },
        })
      })

      describe('when network marketplace token does not have valid smart contract address', () => {
        it.todo('not implemented')
      })

      describe('when seller marketplace does not have valid owner wallet address', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xDEADBEEF',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrderBasedOnStatus({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              SellerMarketplaceDoesNotHaveValidOwnerWalletAddress
            )
            expect(
              (e as SellerMarketplaceDoesNotHaveValidOwnerWalletAddress).message
            ).toEqual(
              'Seller marketplace does not have valid owner wallet address'
            )
          }
        })
      })

      describe('when seller marketplace does not have valid smart contract address', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress: '0xDEADBEEF',
              ownerWalletAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserProductOrderBasedOnStatus({
              ...request,
              userId: user.id,
              userProductOrderId: userProductOrder.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              SellerMarketplaceDoesNotHaveValidSmartContractAddress
            )
            expect(
              (e as SellerMarketplaceDoesNotHaveValidSmartContractAddress)
                .message
            ).toEqual(
              'Seller marketplace does not have valid smart contract address'
            )
          }
        })
      })

      describe('when everything is good', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
            },
          })
        })

        it('returns draft order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            priceFormatted: '1234.09391929 TOKEN',
            priceInTokens: '1234093919290000000000',
            networkChainId: 1,
            networkTitle: 'Network',
            networkBlockchainExplorerURL: 'https://localhost',
            tokenSmartContractAddress:
              '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            sellerDisplayName: 'Seller',
            sellerUsername: 'nickname',
          })
        })
      })
    })
  })

  describe('when order is pending', () => {
    describe('when there are no transactions', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            pendingAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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

    describe('when there is confirmed transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            pendingAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(PendingOrderMustNotHaveConfirmedTransactions)
          expect(
            (e as PendingOrderMustNotHaveConfirmedTransactions).message
          ).toEqual('Pending order must not have confirmed transactions')
        }
      })
    })

    describe('when there is failed transaction', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              pendingAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns pending order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            priceFormatted: '1234.09391929 COIN',
            priceInCoins: '1234093919290000000000',
            networkChainId: 1,
            networkTitle: 'Network',
            networkBlockchainExplorerURL: 'https://localhost',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            sellerDisplayName: 'Seller',
            sellerUsername: 'nickname',
            failedTransactions: [
              {
                transactionHash: '0xHASH',
                date: '2023-10-04T12:16:00.000Z',
              },
            ],
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              pendingAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns pending order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            priceFormatted: '1234.09391929 TOKEN',
            priceInTokens: '1234093919290000000000',
            networkChainId: 1,
            networkTitle: 'Network',
            networkBlockchainExplorerURL: 'https://localhost',
            tokenSmartContractAddress:
              '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            sellerDisplayName: 'Seller',
            sellerUsername: 'nickname',
            failedTransactions: [
              {
                transactionHash: '0xHASH',
                date: '2023-10-04T12:16:00.000Z',
              },
            ],
          })
        })
      })
    })

    describe('when there is pending transaction', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder,
          pendingTransaction: ProductOrderTransaction

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              pendingAt: new Date(),
            },
          })

          pendingTransaction = await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns unconfirmed order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            networkBlockchainExplorerURL: 'https://localhost',
            transactionId: pendingTransaction.id,
            transactionHash: '0xHASH',
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder,
          pendingTransaction: ProductOrderTransaction

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              pendingAt: new Date(),
            },
          })

          pendingTransaction = await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
            },
          })
        })

        it('returns unconfirmed order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            id: userProductOrder.id,
            productTitle: 'Product Title',
            networkBlockchainExplorerURL: 'https://localhost',
            transactionId: pendingTransaction.id,
            transactionHash: '0xHASH',
          })
        })
      })
    })
  })

  describe('when order is refunded', () => {
    describe('when there are no transactions', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
            refundedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(RefundedOrderDoesNotHaveConfirmedTransaction)
          expect(
            (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
          ).toEqual('Refunded order does not have confirmed transaction')
        }
      })
    })

    describe('when there is failed transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
            refundedAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(RefundedOrderDoesNotHaveConfirmedTransaction)
          expect(
            (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
          ).toEqual('Refunded order does not have confirmed transaction')
        }
      })
    })

    describe('when there is pending transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
            refundedAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(RefundedOrderDoesNotHaveConfirmedTransaction)
          expect(
            (e as RefundedOrderDoesNotHaveConfirmedTransaction).message
          ).toEqual('Refunded order does not have confirmed transaction')
        }
      })
    })

    describe('when there is confirmed transaction', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              confirmedAt: new Date('2023-10-03T12:16:00.000Z'),
              refundedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              confirmedAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })
        })

        it('returns confirmed order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            refundedAt: '2023-10-04T12:16:00.000Z',
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              confirmedAt: new Date('2023-10-03T12:16:00.000Z'),
              refundedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              confirmedAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })
        })

        it('returns refunded order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            refundedAt: '2023-10-04T12:16:00.000Z',
          })
        })
      })
    })
  })

  describe('when order is cancelled', () => {
    describe('when there are no transactions', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              cancelledAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })
        })

        it('returns cancelled order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            cancelledAt: '2023-10-03T12:16:00.000Z',
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              cancelledAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })
        })

        it('returns cancelled order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            cancelledAt: '2023-10-03T12:16:00.000Z',
          })
        })
      })
    })

    describe('when there is failed transaction', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              cancelledAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              failedAt: new Date(),
            },
          })
        })

        it('returns cancelled order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            cancelledAt: '2023-10-03T12:16:00.000Z',
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              cancelledAt: new Date('2023-10-03T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              failedAt: new Date(),
            },
          })
        })

        it('returns cancelled order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            cancelledAt: '2023-10-03T12:16:00.000Z',
          })
        })
      })
    })

    describe('when there is pending transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            cancelledAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(CancelledOrderMustNotHavePendingTransactions)
          expect(
            (e as CancelledOrderMustNotHavePendingTransactions).message
          ).toEqual('Cancelled order must not have pending transactions')
        }
      })
    })

    describe('when there is confirmed transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            cancelledAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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
    describe('when there are no transactions', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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

    describe('when there is failed transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
            ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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

    describe('when there is pending transaction', () => {
      let user: User, userProductOrder: ProductOrder

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
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
            confirmedAt: new Date(),
            smartContractAddress: '0xCONTRACT',
            ownerWalletAddress: '0xDEADBEEF',
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
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            price: '1234.093919290000000000',
            priceDecimals: 18,
            priceFormatted: '1234.09391929 COIN',
            confirmedAt: new Date(),
          },
        })

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
          const result = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
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

    describe('when there is confirmed transaction', () => {
      let user: User, network: Network, networkMarketplace: NetworkMarketplace

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            name: 'Seller',
            username: 'nickname',
          },
        })

        network = await prisma.network.create({
          data: {
            title: 'Network',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        networkMarketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })
      })

      describe('when payment method is coin', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
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
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceCoin =
            await prisma.sellerMarketplaceToken.create({
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
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 COIN',
              confirmedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              confirmedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns confirmed order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            confirmedAt: '2023-10-04T12:16:00.000Z',
            productContent: 'Product Content',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
            networkBlockchainExplorerURL: 'https://localhost',
            gas: 123456,
            transactionFee: '0.099919',
            productThumbnailImageURL: null,
          })
        })
      })

      describe('when payment method is ERC20 token', () => {
        let userProductOrder: ProductOrder

        beforeEach(async () => {
          const networkMarketplaceToken =
            await prisma.networkMarketplaceToken.create({
              data: {
                marketplaceId: networkMarketplace.id,
                decimals: 18,
                symbol: 'TOKEN',
                smartContractAddress:
                  '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
              },
            })

          const userMarketplace = await prisma.sellerMarketplace.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              networkMarketplaceId: networkMarketplace.id,
              confirmedAt: new Date(),
              smartContractAddress:
                '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
              ownerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            },
          })

          const userMarketplaceToken =
            await prisma.sellerMarketplaceToken.create({
              data: {
                sellerMarketplaceId: userMarketplace.id,
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
              priceFormatted: '1233.09391929 TOKEN',
              publishedAt: new Date(),
            },
          })

          userProductOrder = await prisma.productOrder.create({
            data: {
              buyerId: user.id,
              productId: product.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
              price: '1234.093919290000000000',
              priceDecimals: 18,
              priceFormatted: '1234.09391929 TOKEN',
              confirmedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0xHASH',
              buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
              gas: 123456,
              transactionFee: '0.099919',
              confirmedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns confirmed order', async () => {
          const order = await getUserProductOrderBasedOnStatus({
            ...request,
            userId: user.id,
            userProductOrderId: userProductOrder.id,
          })

          expect(order).toEqual({
            productTitle: 'Product Title',
            confirmedAt: '2023-10-04T12:16:00.000Z',
            productContent: 'Product Content',
            sellerWalletAddress: '0xB71b214Cb885500844365E95CD9942C7276E7fD8',
            buyerWalletAddress: '0xF474Cf03ccEfF28aBc65C9cbaE594F725c80e12d',
            networkBlockchainExplorerURL: 'https://localhost',
            gas: 123456,
            transactionFee: '0.099919',
            productThumbnailImageURL: null,
          })
        })
      })
    })
  })
})
