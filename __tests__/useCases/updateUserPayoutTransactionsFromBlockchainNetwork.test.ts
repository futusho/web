import { BitQueryClient } from '@/lib/blockchain/client/__mocks__/BitQueryClient'
import { BlockchainClientFactory } from '@/lib/blockchain/client/__mocks__/BlockchainClientFactory'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  updateUserPayoutTransactionsFromBlockchainNetwork,
  BlockchainClientDoesNotExist,
  NetworkDoesNotExist,
} from '@/useCases/updateUserPayoutTransactionsFromBlockchainNetwork'
import { cleanDatabase } from '../helpers'
import type {
  User,
  NetworkMarketplace,
  SellerMarketplace,
  Network,
  SellerMarketplaceToken,
  SellerPayout,
  SellerPayoutTransaction,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('updateUserPayoutTransactionsFromBlockchainNetwork', () => {
  let blockchainClientFactory: BlockchainClientFactory

  const request = {
    networkChainId: 0,
  }

  beforeEach(() => {
    blockchainClientFactory = new BlockchainClientFactory()
  })

  describe('when networkChainId is a negative number', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserPayoutTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
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
        await updateUserPayoutTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
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
        await updateUserPayoutTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
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
        await updateUserPayoutTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
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

      spyGetTransactions = jest
        .spyOn(bitQueryClient, 'getTransactions')
        .mockResolvedValue([])
    })

    it('does nothing', async () => {
      await updateUserPayoutTransactionsFromBlockchainNetwork(
        blockchainClientFactory,
        {
          ...request,
          networkChainId: 1,
        }
      )

      expect(spyGetTransactions).toHaveBeenCalledTimes(0)
    })
  })

  describe('when payout transaction exists', () => {
    let user: User,
      network: Network,
      userMarketplace: SellerMarketplace,
      userMarketplaceToken: SellerMarketplaceToken,
      bitQueryClient: BitQueryClient,
      spyGetTransactions: jest.SpyInstance

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

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      spyGetTransactions = jest.spyOn(bitQueryClient, 'getTransactions')
    })

    describe('when transaction is confirmed', () => {
      let userPayout: SellerPayout

      describe('when payout is pending', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              pendingAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when payout is confirmed', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              confirmedAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when payout is cancelled', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              cancelledAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              confirmedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
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
      let userPayout: SellerPayout

      describe('when payout is pending', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              pendingAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when payout is confirmed', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              confirmedAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when payout is cancelled', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              cancelledAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              failedAt: new Date(),
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
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
      let userPayout: SellerPayout

      describe('when payout is pending', () => {
        describe('when seller marketplace smart contract address is not a valid address', () => {
          it.todo('returns error')
        })

        describe('when transaction on blockchain does not exist', () => {
          beforeEach(async () => {
            userPayout = await prisma.sellerPayout.create({
              data: {
                sellerId: user.id,
                sellerMarketplaceId: userMarketplace.id,
                sellerMarketplaceTokenId: userMarketplaceToken.id,
                amount: '1233.09391929',
                amountFormatted: '1233.09391929 COIN',
                decimals: 18,
                pendingAt: new Date(),
              },
            })

            await prisma.sellerPayoutTransaction.create({
              data: {
                sellerPayoutId: userPayout.id,
                networkId: network.id,
                hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              },
            })

            spyGetTransactions.mockResolvedValue([])
          })

          it('does nothing', async () => {
            await updateUserPayoutTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              {
                ...request,
                networkChainId: 1,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)
          })
        })

        describe('when transaction on blockchain exists', () => {
          let payoutTransaction: SellerPayoutTransaction

          beforeEach(async () => {
            userPayout = await prisma.sellerPayout.create({
              data: {
                sellerId: user.id,
                sellerMarketplaceId: userMarketplace.id,
                sellerMarketplaceTokenId: userMarketplaceToken.id,
                amount: '1233.09391929',
                amountFormatted: '1233.09391929 COIN',
                decimals: 18,
                pendingAt: new Date(),
              },
            })

            payoutTransaction = await prisma.sellerPayoutTransaction.create({
              data: {
                sellerPayoutId: userPayout.id,
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

            it('sets payout transaction as failed', async () => {
              await updateUserPayoutTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                {
                  ...request,
                  networkChainId: 1,
                }
              )

              expect(spyGetTransactions).toHaveBeenCalledTimes(1)

              const updatedTransaction =
                await prisma.sellerPayoutTransaction.findUnique({
                  where: {
                    id: payoutTransaction.id,
                  },
                })

              if (!updatedTransaction) {
                throw new Error('Unable to get payout transaction')
              }

              expect(updatedTransaction.failedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(updatedTransaction.ownerWalletAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )
              expect(updatedTransaction.gas).toEqual(126154)
              expect(updatedTransaction.transactionFee).toEqual(
                '0.00227077202640896'
              )
              expect(updatedTransaction.blockchainError).toEqual(
                'Contract error'
              )
            })
          })
        })
      })

      describe('when payout is confirmed', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              confirmedAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            {
              ...request,
              networkChainId: 1,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('when payout is cancelled', () => {
        beforeEach(async () => {
          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1233.09391929',
              amountFormatted: '1233.09391929 COIN',
              decimals: 18,
              cancelledAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserPayoutTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
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
      spyGetTransactions: jest.SpyInstance

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

      spyGetTransactions = jest.spyOn(bitQueryClient, 'getTransactions')
    })

    describe('when transaction is pending', () => {
      describe('when payout is pending', () => {
        describe('when transaction on blockchain exists and success', () => {
          let userPayout: SellerPayout,
            payoutTransaction: SellerPayoutTransaction

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
                ownerWalletAddress:
                  '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
              },
            })

            const userMarketplaceToken =
              await prisma.sellerMarketplaceToken.create({
                data: {
                  sellerMarketplaceId: userMarketplace.id,
                  networkMarketplaceTokenId: networkMarketplaceCoin.id,
                },
              })

            userPayout = await prisma.sellerPayout.create({
              data: {
                sellerId: user.id,
                sellerMarketplaceId: userMarketplace.id,
                sellerMarketplaceTokenId: userMarketplaceToken.id,
                amount: '1233.09391929',
                amountFormatted: '1233.09391929 COIN',
                decimals: 18,
                pendingAt: new Date(),
              },
            })

            payoutTransaction = await prisma.sellerPayoutTransaction.create({
              data: {
                sellerPayoutId: userPayout.id,
                networkId: network.id,
                hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
              },
            })

            spyGetTransactions.mockResolvedValue([
              {
                hash: '0x5ba3ca64b56c9945a9818e0a1151ce143a7522e4fad485a5a61ee438781fbef7',
                senderAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                amountPaid: '',
                error: '',
                success: true,
                tokenAddress: null,
                timestamp: new Date('2023-07-15T19:51:22Z'),
                gas: 126154,
                gasValue: '0.00227077202640896',
              },
            ])
          })

          it('confirmes payout transaction', async () => {
            await updateUserPayoutTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              {
                ...request,
                networkChainId: 1,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)

            const updatedTransaction =
              await prisma.sellerPayoutTransaction.findUnique({
                where: {
                  id: payoutTransaction.id,
                },
              })

            if (!updatedTransaction) {
              throw new Error('Unable to get payout transaction')
            }

            expect(updatedTransaction.failedAt).toBeNull()
            expect(updatedTransaction.confirmedAt).toEqual(
              new Date('2023-07-15T19:51:22Z')
            )
            expect(updatedTransaction.ownerWalletAddress).toEqual(
              '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
            )
            expect(updatedTransaction.gas).toEqual(126154)
            expect(updatedTransaction.transactionFee).toEqual(
              '0.00227077202640896'
            )
            expect(updatedTransaction.blockchainError).toEqual('')
          })

          it('confirmes payout', async () => {
            await updateUserPayoutTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              {
                ...request,
                networkChainId: 1,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)

            const updatedPayout = await prisma.sellerPayout.findUnique({
              where: {
                id: userPayout.id,
              },
            })

            if (!updatedPayout) {
              throw new Error('Unable to get payout')
            }

            expect(updatedPayout.confirmedAt).toEqual(
              new Date('2023-07-15T19:51:22Z')
            )
          })
        })
      })
    })
  })
})
