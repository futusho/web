import { zeroAddress } from 'viem'
import { BitQueryClient } from '@/lib/blockchain/client/__mocks__/BitQueryClient'
import { BlockchainClientFactory } from '@/lib/blockchain/client/__mocks__/BlockchainClientFactory'
import { BlockchainSellerMarketplaceClientFactory } from '@/lib/blockchain/seller-marketplace/__mocks__/BlockchainSellerMarketplaceClientFactory'
import { SellerMarketplaceJestNetworkClient } from '@/lib/blockchain/seller-marketplace/__mocks__/SellerMarketplaceJestNetworkClient'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  updateUserProductOrderTransactionsFromBlockchainNetwork,
  BlockchainClientDoesNotExist,
  BlockchainSellerMarketplaceClientDoesNotExist,
  NetworkDoesNotExist,
} from '@/useCases/updateUserProductOrderTransactionsFromBlockchainNetwork'
import { cleanDatabase } from '../helpers'
import type {
  User,
  NetworkMarketplace,
  SellerMarketplace,
  Network,
  ProductOrder,
  SellerMarketplaceToken,
  Product,
  ProductOrderTransaction,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('updateUserProductOrderTransactionsFromBlockchainNetwork', () => {
  let blockchainClientFactory: BlockchainClientFactory
  let blockchainSellerMarketplaceClientFactory: BlockchainSellerMarketplaceClientFactory

  const request = {
    networkChainId: 0,
  }

  beforeEach(() => {
    blockchainClientFactory = new BlockchainClientFactory()
    blockchainSellerMarketplaceClientFactory =
      new BlockchainSellerMarketplaceClientFactory()
  })

  describe('when networkChainId is a negative number', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProductOrderTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainSellerMarketplaceClientFactory,
          {
            ...request,
            networkChainId: -1,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'networkChainId: Number must be greater than 0',
        ])
      }
    })
  })

  describe('when networkChainId is zero', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProductOrderTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainSellerMarketplaceClientFactory,
          {
            ...request,
            networkChainId: 0,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'networkChainId: Number must be greater than 0',
        ])
      }
    })
  })

  describe('when network by chain id does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProductOrderTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainSellerMarketplaceClientFactory,
          {
            ...request,
            networkChainId: 42,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(NetworkDoesNotExist)
        expect((e as NetworkDoesNotExist).message).toEqual(
          'Network does not exist'
        )
      }
    })
  })

  describe('when blockchain client does not exist', () => {
    beforeEach(async () => {
      await prisma.network.create({
        data: {
          title: 'Network',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      jest.spyOn(blockchainClientFactory, 'getClient').mockReturnValue(null)
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProductOrderTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainSellerMarketplaceClientFactory,
          {
            ...request,
            networkChainId: 1,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(BlockchainClientDoesNotExist)
        expect((e as BlockchainClientDoesNotExist).message).toEqual(
          'Blockchain client for network chain id 1 does not exist'
        )
      }
    })
  })

  describe('when blockchain seller marketplace client does not exist', () => {
    beforeEach(async () => {
      await prisma.network.create({
        data: {
          title: 'Network',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      jest
        .spyOn(blockchainSellerMarketplaceClientFactory, 'getClient')
        .mockReturnValue(null)
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProductOrderTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainSellerMarketplaceClientFactory,
          {
            ...request,
            networkChainId: 1,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(BlockchainSellerMarketplaceClientDoesNotExist)
        expect(
          (e as BlockchainSellerMarketplaceClientDoesNotExist).message
        ).toEqual(
          'Blockchain seller marketplace client for network chain id 1 does not exist'
        )
      }
    })
  })

  describe('when there are no transactions', () => {
    let spyGetTransactions: jest.SpyInstance

    beforeEach(async () => {
      await prisma.network.create({
        data: {
          title: 'Network',
          chainId: 1,
          blockchainExplorerURL: 'https://localhost',
        },
      })

      const bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      const jestNetworkClient = new SellerMarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainSellerMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest
        .spyOn(bitQueryClient, 'getTransactions')
        .mockResolvedValue([])
    })

    it('does nothing', async () => {
      await updateUserProductOrderTransactionsFromBlockchainNetwork(
        blockchainClientFactory,
        blockchainSellerMarketplaceClientFactory,
        {
          ...request,
          networkChainId: 1,
        }
      )

      expect(spyGetTransactions).toHaveBeenCalledTimes(0)
    })
  })

  describe('when product order transaction exists', () => {
    let user: User,
      network: Network,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken,
      product: Product,
      bitQueryClient: BitQueryClient,
      jestNetworkClient: SellerMarketplaceJestNetworkClient,
      spyGetTransactions: jest.SpyInstance,
      spyGetOrder: jest.SpyInstance

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
          smartContractAddress: '0xbf99fd391cd45e984be4532ab8909a0126a51f12',
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
          smartContractAddress: '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
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

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      jestNetworkClient = new SellerMarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainSellerMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest.spyOn(bitQueryClient, 'getTransactions')

      spyGetOrder = jest.spyOn(jestNetworkClient, 'getOrder')
    })

    describe('when transaction is confirmed', () => {
      let userProductOrder: ProductOrder

      describe('when order is pending', () => {
        beforeEach(async () => {
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
              pendingAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is confirmed', () => {
        beforeEach(async () => {
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
              confirmedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is cancelled', () => {
        beforeEach(async () => {
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
              cancelledAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is refunded', () => {
        beforeEach(async () => {
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
              refundedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })
    })

    describe('when transaction is failed', () => {
      let userProductOrder: ProductOrder

      describe('when order is pending', () => {
        beforeEach(async () => {
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
              pendingAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is confirmed', () => {
        beforeEach(async () => {
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
              confirmedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is cancelled', () => {
        beforeEach(async () => {
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
              cancelledAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is refunded', () => {
        beforeEach(async () => {
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
              refundedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })
    })

    describe('when transaction is pending', () => {
      let userProductOrder: ProductOrder

      describe('when order is pending', () => {
        describe('when seller marketplace smart contract address is not a valid address', () => {
          it.todo('returns error')
        })

        describe('when transaction on blockchain does not exist', () => {
          beforeEach(async () => {
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
                pendingAt: new Date(),
              },
            })

            await prisma.productOrderTransaction.create({
              data: {
                productOrderId: userProductOrder.id,
                networkId: network.id,
                hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              },
            })

            spyGetTransactions.mockResolvedValue([])
          })

          it('does nothing', async () => {
            await updateUserProductOrderTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              blockchainSellerMarketplaceClientFactory,
              {
                ...request,
                networkChainId: 1,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)
            expect(spyGetOrder).toHaveBeenCalledTimes(0)
          })
        })

        describe('when transaction on blockchain exists', () => {
          let productOrderTransaction: ProductOrderTransaction

          beforeEach(async () => {
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
                pendingAt: new Date(),
              },
            })

            productOrderTransaction =
              await prisma.productOrderTransaction.create({
                data: {
                  productOrderId: userProductOrder.id,
                  networkId: network.id,
                  hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                },
              })
          })

          describe('when blockchain transaction is failed', () => {
            beforeEach(() => {
              spyGetTransactions.mockResolvedValue([
                {
                  hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                  senderAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                  amountPaid: 0,
                  error: 'Contract error',
                  success: false,
                  tokenAddress: null,
                  timestamp: new Date('2023-07-15T19:51:22Z'),
                  gas: 126154,
                  gasValue: '0.00227077202640896',
                },
              ])
            })

            it('sets order transaction as failed', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(0)

              const updatedOrderTransaction =
                await prisma.productOrderTransaction.findUnique({
                  where: {
                    id: productOrderTransaction.id,
                  },
                })

              if (!updatedOrderTransaction) {
                throw new Error('Unable to get product order transaction')
              }

              expect(updatedOrderTransaction.failedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(updatedOrderTransaction.buyerWalletAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )
              expect(updatedOrderTransaction.gas).toEqual(126154)
              expect(updatedOrderTransaction.transactionFee).toEqual(
                '0.00227077202640896'
              )
              expect(updatedOrderTransaction.blockchainError).toEqual(
                'Contract error'
              )
            })
          })
        })
      })

      describe('when order is confirmed', () => {
        beforeEach(async () => {
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
              confirmedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is cancelled', () => {
        beforeEach(async () => {
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
              cancelledAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when order is refunded', () => {
        beforeEach(async () => {
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
              refundedAt: new Date(),
            },
          })

          await prisma.productOrderTransaction.create({
            data: {
              productOrderId: userProductOrder.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserProductOrderTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainSellerMarketplaceClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })
    })
  })

  describe('when everything is good', () => {
    let user: User,
      network: Network,
      networkMarketplace: NetworkMarketplace,
      bitQueryClient: BitQueryClient,
      jestNetworkClient: SellerMarketplaceJestNetworkClient,
      spyGetTransactions: jest.SpyInstance,
      spyGetOrder: jest.SpyInstance

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

      networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xbf99fd391cd45e984be4532ab8909a0126a51f12',
          commissionRate: 3,
        },
      })

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      jestNetworkClient = new SellerMarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainSellerMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest.spyOn(bitQueryClient, 'getTransactions')

      spyGetOrder = jest.spyOn(jestNetworkClient, 'getOrder')
    })

    describe('when transaction is pending', () => {
      describe('when order is pending', () => {
        describe('when transaction on blockchain exists and success', () => {
          let userMarketplace: SellerMarketplace,
            userMarketplaceToken: SellerMarketplaceToken,
            userProductOrder: ProductOrder,
            productOrderTransaction: ProductOrderTransaction,
            product: Product

          describe('when payment is native coin', () => {
            beforeEach(async () => {
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
                  smartContractAddress:
                    '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
                  ownerWalletAddress: '0xWALLET',
                },
              })

              userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
                {
                  data: {
                    sellerMarketplaceId: userMarketplace.id,
                    networkMarketplaceTokenId: networkMarketplaceCoin.id,
                  },
                }
              )

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
                  pendingAt: new Date(),
                },
              })

              productOrderTransaction =
                await prisma.productOrderTransaction.create({
                  data: {
                    productOrderId: userProductOrder.id,
                    networkId: network.id,
                    hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                  },
                })

              spyGetTransactions.mockResolvedValue([
                {
                  hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                  senderAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                  amountPaid: '1233093919290000000000',
                  error: '',
                  success: true,
                  tokenAddress: null,
                  timestamp: new Date('2023-07-15T19:51:22Z'),
                  gas: 126154,
                  gasValue: '0.00227077202640896',
                },
              ])

              spyGetOrder.mockResolvedValue({
                buyerAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                price: BigInt('1233093919290000000000'),
                paymentContract: zeroAddress,
              })
            })

            it('confirmes product order transaction', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const updatedOrderTransaction =
                await prisma.productOrderTransaction.findUnique({
                  where: {
                    id: productOrderTransaction.id,
                  },
                })

              if (!updatedOrderTransaction) {
                throw new Error('Unable to get product order transaction')
              }

              expect(updatedOrderTransaction.failedAt).toBeNull()
              expect(updatedOrderTransaction.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(updatedOrderTransaction.buyerWalletAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )
              expect(updatedOrderTransaction.gas).toEqual(126154)
              expect(updatedOrderTransaction.transactionFee).toEqual(
                '0.00227077202640896'
              )
              expect(updatedOrderTransaction.blockchainError).toEqual('')
            })

            it('confirmes product order', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const updatedProductOrder = await prisma.productOrder.findUnique({
                where: {
                  id: userProductOrder.id,
                },
              })

              if (!updatedProductOrder) {
                throw new Error('Unable to get product order')
              }

              expect(updatedProductOrder.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
            })

            it('stores a product sale', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const productSales = await prisma.productSale.findMany({
                where: {
                  productOrderTransactionId: productOrderTransaction.id,
                },
              })

              expect(productSales).toHaveLength(1)

              const productSale = productSales[0]

              expect(productSale.sellerId).toEqual(user.id)
              expect(productSale.productId).toEqual(product.id)
              expect(productSale.sellerMarketplaceId).toEqual(
                userMarketplace.id
              )
              expect(productSale.sellerMarketplaceTokenId).toEqual(
                userMarketplaceToken.id
              )
              expect(productSale.sellerIncome.toString()).toEqual(
                '1196.1011017113'
              )
              expect(productSale.sellerIncomeFormatted).toEqual(
                '1196.1011017113 COIN'
              )
              expect(productSale.platformIncome.toString()).toEqual(
                '36.9928175787'
              )
              expect(productSale.platformIncomeFormatted).toEqual(
                '36.9928175787 COIN'
              )
              expect(productSale.decimals).toEqual(18)
            })
          })

          describe('when payment is ERC20 token', () => {
            beforeEach(async () => {
              const networkMarketplaceToken =
                await prisma.networkMarketplaceToken.create({
                  data: {
                    marketplaceId: networkMarketplace.id,
                    decimals: 18,
                    smartContractAddress:
                      '0xa2959d3f95eae5dc7d70144ce1b73b403b7eb6e0',
                    symbol: 'TOKEN',
                  },
                })

              userMarketplace = await prisma.sellerMarketplace.create({
                data: {
                  sellerId: user.id,
                  networkId: network.id,
                  networkMarketplaceId: networkMarketplace.id,
                  confirmedAt: new Date(),
                  smartContractAddress:
                    '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
                  ownerWalletAddress: '0xWALLET',
                },
              })

              userMarketplaceToken = await prisma.sellerMarketplaceToken.create(
                {
                  data: {
                    sellerMarketplaceId: userMarketplace.id,
                    networkMarketplaceTokenId: networkMarketplaceToken.id,
                  },
                }
              )

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
                  price: '0.0099919',
                  priceDecimals: 18,
                  priceFormatted: '0.0099919 TOKEN',
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
                  price: '0.0099919',
                  priceDecimals: 18,
                  priceFormatted: '0.0099919 TOKEN',
                  pendingAt: new Date(),
                },
              })

              productOrderTransaction =
                await prisma.productOrderTransaction.create({
                  data: {
                    productOrderId: userProductOrder.id,
                    networkId: network.id,
                    hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                  },
                })

              spyGetTransactions.mockResolvedValue([
                {
                  hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                  senderAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                  amountPaid: '9991900000000000',
                  error: '',
                  success: true,
                  tokenAddress: null,
                  timestamp: new Date('2023-07-15T19:51:22Z'),
                  gas: 126154,
                  gasValue: '0.00227077202640896',
                },
              ])

              spyGetOrder.mockResolvedValue({
                buyerAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                price: BigInt('9991900000000000'),
                paymentContract: '0xa2959d3f95eae5dc7d70144ce1b73b403b7eb6e0',
              })
            })

            it('confirmes product order transaction', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const updatedOrderTransaction =
                await prisma.productOrderTransaction.findUnique({
                  where: {
                    id: productOrderTransaction.id,
                  },
                })

              if (!updatedOrderTransaction) {
                throw new Error('Unable to get product order transaction')
              }

              expect(updatedOrderTransaction.failedAt).toBeNull()
              expect(updatedOrderTransaction.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(updatedOrderTransaction.buyerWalletAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )
              expect(updatedOrderTransaction.gas).toEqual(126154)
              expect(updatedOrderTransaction.transactionFee).toEqual(
                '0.00227077202640896'
              )
              expect(updatedOrderTransaction.blockchainError).toEqual('')
            })

            it('confirmes product order', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const updatedProductOrder = await prisma.productOrder.findUnique({
                where: {
                  id: userProductOrder.id,
                },
              })

              if (!updatedProductOrder) {
                throw new Error('Unable to get product order')
              }

              expect(updatedProductOrder.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
            })

            it('stores a product sale', async () => {
              await updateUserProductOrderTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainSellerMarketplaceClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)
              expect(spyGetOrder).toHaveBeenCalledTimes(1)

              const productSales = await prisma.productSale.findMany({
                where: {
                  productOrderTransactionId: productOrderTransaction.id,
                },
              })

              expect(productSales).toHaveLength(1)

              const productSale = productSales[0]

              expect(productSale.sellerId).toEqual(user.id)
              expect(productSale.productId).toEqual(product.id)
              expect(productSale.sellerMarketplaceId).toEqual(
                userMarketplace.id
              )
              expect(productSale.sellerMarketplaceTokenId).toEqual(
                userMarketplaceToken.id
              )
              expect(productSale.sellerIncome.toString()).toEqual('0.009692143')
              expect(productSale.sellerIncomeFormatted).toEqual(
                '0.009692143 TOKEN'
              )
              expect(productSale.platformIncome.toString()).toEqual(
                '0.000299757'
              )
              expect(productSale.platformIncomeFormatted).toEqual(
                '0.000299757 TOKEN'
              )
              expect(productSale.decimals).toEqual(18)
            })
          })
        })
      })
    })
  })
})
