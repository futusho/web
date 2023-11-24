import { v4 as uuidv4 } from 'uuid'
import { BitQueryClient } from '@/lib/blockchain/client/__mocks__/BitQueryClient'
import { BlockchainClientFactory } from '@/lib/blockchain/client/__mocks__/BlockchainClientFactory'
import { BlockchainMarketplaceClientFactory } from '@/lib/blockchain/marketplace/__mocks__/BlockchainMarketplaceClientFactory'
import { MarketplaceJestNetworkClient } from '@/lib/blockchain/marketplace/__mocks__/MarketplaceJestNetworkClient'
import { prisma } from '@/lib/prisma'
import type { BlockchainTransactionHash } from '@/types/blockchain'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  updateUserMarketplaceTransactionsFromBlockchainNetwork,
  NetworkMarketplaceDoesNotExist,
  BlockchainClientDoesNotExist,
  BlockchainMarketplaceClientDoesNotExist,
  UnableToGetSellerMarketplaceFromBlockchainMarketplace,
} from '@/useCases/updateUserMarketplaceTransactionsFromBlockchainNetwork'
import { cleanDatabase } from '../helpers'
import type {
  User,
  NetworkMarketplace,
  SellerMarketplace,
  SellerMarketplaceTransaction,
  Network,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('updateUserMarketplaceTransactionsFromBlockchainNetwork', () => {
  let blockchainClientFactory: BlockchainClientFactory
  let blockchainMarketplaceClientFactory: BlockchainMarketplaceClientFactory

  const request = {
    networkMarketplaceId: uuidv4(),
  }

  beforeEach(() => {
    blockchainClientFactory = new BlockchainClientFactory()
    blockchainMarketplaceClientFactory =
      new BlockchainMarketplaceClientFactory()
  })

  describe('when networkMarketplaceId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: 'not-an-uuid',
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'networkMarketplaceId: Invalid uuid',
        ])
      }
    })
  })

  describe('when network marketplace does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: uuidv4(),
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(NetworkMarketplaceDoesNotExist)
        expect((e as NetworkMarketplaceDoesNotExist).message).toEqual(
          'Network marketplace does not exist'
        )
      }
    })
  })

  describe('when blockchain client does not exist', () => {
    let networkMarketplace: NetworkMarketplace

    beforeEach(async () => {
      const network = await prisma.network.create({
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
          commissionRate: 1,
        },
      })

      jest.spyOn(blockchainClientFactory, 'getClient').mockReturnValue(null)
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: networkMarketplace.id,
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

  describe('when blockchain marketplace client does not exist', () => {
    let networkMarketplace: NetworkMarketplace

    beforeEach(async () => {
      const network = await prisma.network.create({
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
          commissionRate: 1,
        },
      })

      const bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      jest
        .spyOn(blockchainMarketplaceClientFactory, 'getClient')
        .mockReturnValue(null)
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: networkMarketplace.id,
          }
        )
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(BlockchainMarketplaceClientDoesNotExist)
        expect((e as BlockchainMarketplaceClientDoesNotExist).message).toEqual(
          'Blockchain marketplace client for network chain id 1 does not exist'
        )
      }
    })
  })

  describe('when there are no transactions', () => {
    let networkMarketplace: NetworkMarketplace,
      spyGetTransactions: jest.SpyInstance

    beforeEach(async () => {
      const network = await prisma.network.create({
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
          commissionRate: 1,
        },
      })

      const bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      const jestNetworkClient = new MarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest
        .spyOn(bitQueryClient, 'getTransactions')
        .mockResolvedValue([])
    })

    it('does nothing', async () => {
      await updateUserMarketplaceTransactionsFromBlockchainNetwork(
        blockchainClientFactory,
        blockchainMarketplaceClientFactory,
        {
          ...request,
          networkMarketplaceId: networkMarketplace.id,
        }
      )

      expect(spyGetTransactions).toHaveBeenCalledTimes(0)
    })
  })

  describe('when user marketplace is confirmed', () => {
    let networkMarketplace: NetworkMarketplace,
      bitQueryClient: BitQueryClient,
      spyGetTransactions: jest.SpyInstance

    beforeEach(async () => {
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

      networkMarketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network.id,
          smartContractAddress: '0xbf99fd391cd45e984be4532ab8909a0126a51f12',
          commissionRate: 1,
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

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          sellerMarketplaceId: userMarketplace.id,
          hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677125',
          senderAddress: '',
          gas: 0,
          transactionFee: '',
        },
      })

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      const jestNetworkClient = new MarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest
        .spyOn(bitQueryClient, 'getTransactions')
        .mockResolvedValue([])
    })

    it('does nothing', async () => {
      await updateUserMarketplaceTransactionsFromBlockchainNetwork(
        blockchainClientFactory,
        blockchainMarketplaceClientFactory,
        {
          ...request,
          networkMarketplaceId: networkMarketplace.id,
        }
      )

      expect(spyGetTransactions).toHaveBeenCalledTimes(0)
    })
  })

  describe('when user marketplace is pending', () => {
    let networkMarketplace: NetworkMarketplace,
      user: User,
      network: Network,
      userMarketplace: SellerMarketplace,
      bitQueryClient: BitQueryClient,
      jestNetworkClient: MarketplaceJestNetworkClient,
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
          commissionRate: 1,
        },
      })

      userMarketplace = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network.id,
          networkMarketplaceId: networkMarketplace.id,
          smartContractAddress: '',
          ownerWalletAddress: '',
        },
      })

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      jestNetworkClient = new MarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest.spyOn(bitQueryClient, 'getTransactions')
    })

    describe('when there is only failed transaction', () => {
      beforeEach(async () => {
        await prisma.sellerMarketplaceTransaction.create({
          data: {
            sellerId: user.id,
            networkId: network.id,
            sellerMarketplaceId: userMarketplace.id,
            hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677125',
            senderAddress: '',
            gas: 0,
            transactionFee: '',
            failedAt: new Date(),
          },
        })
      })

      it('does nothing', async () => {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: networkMarketplace.id,
          }
        )

        expect(spyGetTransactions).toHaveBeenCalledTimes(0)
      })
    })

    // NOTE: It's a wrong situation, because pending marketplace couldn't have confirmed transaction
    describe('when there is only confirmed transaction', () => {
      beforeEach(async () => {
        await prisma.sellerMarketplaceTransaction.create({
          data: {
            sellerId: user.id,
            networkId: network.id,
            sellerMarketplaceId: userMarketplace.id,
            hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677125',
            senderAddress: '',
            gas: 0,
            transactionFee: '',
            confirmedAt: new Date(),
          },
        })
      })

      it('does nothing', async () => {
        await updateUserMarketplaceTransactionsFromBlockchainNetwork(
          blockchainClientFactory,
          blockchainMarketplaceClientFactory,
          {
            ...request,
            networkMarketplaceId: networkMarketplace.id,
          }
        )

        expect(spyGetTransactions).toHaveBeenCalledTimes(0)
      })
    })

    describe('when there is pending transaction', () => {
      describe('with invalid transaction hash', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              sellerMarketplaceId: userMarketplace.id,
              hash: '0xHASH',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserMarketplaceTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainMarketplaceClientFactory,
            {
              ...request,
              networkMarketplaceId: networkMarketplace.id,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('with too short transaction hash', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              sellerMarketplaceId: userMarketplace.id,
              hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d067712',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserMarketplaceTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainMarketplaceClientFactory,
            {
              ...request,
              networkMarketplaceId: networkMarketplace.id,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('with too long transaction hash', () => {
        beforeEach(async () => {
          await prisma.sellerMarketplaceTransaction.create({
            data: {
              sellerId: user.id,
              networkId: network.id,
              sellerMarketplaceId: userMarketplace.id,
              hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d06771222',
            },
          })
        })

        it('does nothing', async () => {
          await updateUserMarketplaceTransactionsFromBlockchainNetwork(
            blockchainClientFactory,
            blockchainMarketplaceClientFactory,
            {
              ...request,
              networkMarketplaceId: networkMarketplace.id,
            }
          )

          expect(spyGetTransactions).toHaveBeenCalledTimes(0)
        })
      })

      describe('with a valid transaction hash', () => {
        let userMarketplaceTransaction: SellerMarketplaceTransaction,
          spyGetSellerMarketplaceAddress: jest.SpyInstance

        beforeEach(async () => {
          userMarketplaceTransaction =
            await prisma.sellerMarketplaceTransaction.create({
              data: {
                sellerId: user.id,
                networkId: network.id,
                sellerMarketplaceId: userMarketplace.id,
                hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677122',
              },
            })

          spyGetSellerMarketplaceAddress = jest.spyOn(
            jestNetworkClient,
            'getSellerMarketplaceAddress'
          )
        })

        describe('when there is no transaction on blockchain yet', () => {
          beforeEach(() => {
            spyGetTransactions.mockResolvedValue([])
          })

          it('does nothing', async () => {
            await updateUserMarketplaceTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              blockchainMarketplaceClientFactory,
              {
                ...request,
                networkMarketplaceId: networkMarketplace.id,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)
            expect(spyGetSellerMarketplaceAddress).toHaveBeenCalledTimes(0)

            const userMarketplaceAfter =
              await prisma.sellerMarketplace.findUnique({
                where: {
                  id: userMarketplace.id,
                },
              })

            if (!userMarketplaceAfter) {
              throw new Error('Unable to get user marketplace')
            }

            expect(userMarketplaceAfter.confirmedAt).toBeNull()
            expect(userMarketplaceAfter.smartContractAddress).toEqual('')
            expect(userMarketplaceAfter.ownerWalletAddress).toEqual('')

            const transactionAfter =
              await prisma.sellerMarketplaceTransaction.findUnique({
                where: {
                  id: userMarketplaceTransaction.id,
                },
              })

            if (!transactionAfter) {
              throw new Error('Unable to get user transaction')
            }

            expect(transactionAfter.failedAt).toBeNull()
            expect(transactionAfter.confirmedAt).toBeNull()
            expect(transactionAfter.senderAddress).toEqual('')
            expect(transactionAfter.gas).toEqual(0)
            expect(transactionAfter.transactionFee).toEqual('')
            expect(transactionAfter.blockchainError).toEqual('')
          })
        })

        describe('when blockchain returns transaction which does not exist in a database', () => {
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

          it('does nothing', async () => {
            await updateUserMarketplaceTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              blockchainMarketplaceClientFactory,
              {
                ...request,
                networkMarketplaceId: networkMarketplace.id,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)
            expect(spyGetSellerMarketplaceAddress).toHaveBeenCalledTimes(0)

            const userMarketplaceAfter =
              await prisma.sellerMarketplace.findUnique({
                where: {
                  id: userMarketplace.id,
                },
              })

            if (!userMarketplaceAfter) {
              throw new Error('Unable to get user marketplace')
            }

            expect(userMarketplaceAfter.confirmedAt).toBeNull()
            expect(userMarketplaceAfter.smartContractAddress).toEqual('')
            expect(userMarketplaceAfter.ownerWalletAddress).toEqual('')

            const transactionAfter =
              await prisma.sellerMarketplaceTransaction.findUnique({
                where: {
                  id: userMarketplaceTransaction.id,
                },
              })

            if (!transactionAfter) {
              throw new Error('Unable to get user transaction')
            }

            expect(transactionAfter.failedAt).toBeNull()
            expect(transactionAfter.confirmedAt).toBeNull()
            expect(transactionAfter.senderAddress).toEqual('')
            expect(transactionAfter.gas).toEqual(0)
            expect(transactionAfter.transactionFee).toEqual('')
            expect(transactionAfter.blockchainError).toEqual('')
          })
        })

        describe('when blockchain returns failed transaction', () => {
          beforeEach(() => {
            spyGetTransactions.mockResolvedValue([
              {
                hash: userMarketplaceTransaction.hash as BlockchainTransactionHash,
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

          it('changes transaction status to failed', async () => {
            await updateUserMarketplaceTransactionsFromBlockchainNetwork(
              blockchainClientFactory,
              blockchainMarketplaceClientFactory,
              {
                ...request,
                networkMarketplaceId: networkMarketplace.id,
              }
            )

            expect(spyGetTransactions).toHaveBeenCalledTimes(1)
            expect(spyGetSellerMarketplaceAddress).toHaveBeenCalledTimes(0)

            const userMarketplaceAfter =
              await prisma.sellerMarketplace.findUnique({
                where: {
                  id: userMarketplace.id,
                },
              })

            if (!userMarketplaceAfter) {
              throw new Error('Unable to get user marketplace')
            }

            expect(userMarketplaceAfter.confirmedAt).toBeNull()

            const updatedTransaction =
              await prisma.sellerMarketplaceTransaction.findUnique({
                where: {
                  id: userMarketplaceTransaction.id,
                },
              })

            if (!updatedTransaction) {
              throw new Error('Unable to get user transaction')
            }

            expect(updatedTransaction.confirmedAt).toBeNull()
            expect(updatedTransaction.failedAt).toEqual(
              new Date('2023-07-15T19:51:22Z')
            )
            expect(updatedTransaction.senderAddress).toEqual(
              '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
            )
            expect(updatedTransaction.gas).toEqual(126154)
            expect(updatedTransaction.transactionFee).toEqual(
              '0.00227077202640896'
            )
            expect(updatedTransaction.blockchainError).toEqual('Contract error')
          })
        })

        describe('when blockchain returns successful transaction', () => {
          beforeEach(() => {
            spyGetTransactions.mockResolvedValue([
              {
                hash: userMarketplaceTransaction.hash as BlockchainTransactionHash,
                senderAddress: '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8',
                amountPaid: 0.99919,
                error: '',
                success: true,
                tokenAddress: null,
                timestamp: new Date('2023-07-15T19:51:22Z'),
                gas: 126154,
                gasValue: '0.00227077202640896',
              },
            ])
          })

          describe('when blockchain marketplace client does not return seller marketplace', () => {
            beforeEach(() => {
              spyGetSellerMarketplaceAddress.mockResolvedValue(null)
            })

            it('returns error', async () => {
              expect.assertions(3)

              try {
                await updateUserMarketplaceTransactionsFromBlockchainNetwork(
                  blockchainClientFactory,
                  blockchainMarketplaceClientFactory,
                  {
                    ...request,
                    networkMarketplaceId: networkMarketplace.id,
                  }
                )
              } catch (e) {
                expect(e).toBeInstanceOf(InternalServerError)
                expect(e).toBeInstanceOf(
                  UnableToGetSellerMarketplaceFromBlockchainMarketplace
                )
                expect(
                  (e as UnableToGetSellerMarketplaceFromBlockchainMarketplace)
                    .message
                ).toEqual(
                  'Unable to get seller marketplace from blockchain marketplace'
                )
              }
            })
          })

          describe('when blockchain marketplace client returns seller marketplace', () => {
            beforeEach(() => {
              spyGetSellerMarketplaceAddress.mockResolvedValue(
                '0x1284214b9b9c85549aB3D2b972df0dEEf66aC2c9'
              )
            })

            it('sets transaction as confirmed', async () => {
              await updateUserMarketplaceTransactionsFromBlockchainNetwork(
                blockchainClientFactory,
                blockchainMarketplaceClientFactory,
                {
                  ...request,
                  networkMarketplaceId: networkMarketplace.id,
                }
              )

              const userMarketplaceAfter =
                await prisma.sellerMarketplace.findUnique({
                  where: {
                    id: userMarketplace.id,
                  },
                })

              if (!userMarketplaceAfter) {
                throw new Error('Unable to get user marketplace')
              }

              expect(userMarketplaceAfter.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(userMarketplaceAfter.smartContractAddress).toEqual(
                '0x1284214b9b9c85549aB3D2b972df0dEEf66aC2c9'
              )
              expect(userMarketplaceAfter.ownerWalletAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )

              const updatedTransaction =
                await prisma.sellerMarketplaceTransaction.findUnique({
                  where: {
                    id: userMarketplaceTransaction.id,
                  },
                })

              if (!updatedTransaction) {
                throw new Error('Unable to get user transaction')
              }

              expect(updatedTransaction.failedAt).toBeNull()
              expect(updatedTransaction.confirmedAt).toEqual(
                new Date('2023-07-15T19:51:22Z')
              )
              expect(updatedTransaction.senderAddress).toEqual(
                '0xe5a26cc0ec6f20f20b793262e6eb16fe1edbe2d8'
              )
              expect(updatedTransaction.gas).toEqual(126154)
              expect(updatedTransaction.transactionFee).toEqual(
                '0.00227077202640896'
              )
              expect(updatedTransaction.blockchainError).toEqual('')
            })
          })
        })
      })
    })
  })

  describe('when there is a pending transaction for another network', () => {
    let network1Marketplace: NetworkMarketplace,
      bitQueryClient: BitQueryClient,
      spyGetTransactions: jest.SpyInstance

    beforeEach(async () => {
      const user = await prisma.user.create({
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

      network1Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network1.id,
          smartContractAddress: '0xbf99fd391cd45e984be4532ab8909a0126a51f12',
          commissionRate: 1,
        },
      })

      const network2Marketplace = await prisma.networkMarketplace.create({
        data: {
          networkId: network2.id,
          smartContractAddress: '0xbf99fd391cd45e984be4532ab8909a0126a51f12',
          commissionRate: 2,
        },
      })

      const userMarketplace1 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          networkMarketplaceId: network1Marketplace.id,
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      const userMarketplace2 = await prisma.sellerMarketplace.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          networkMarketplaceId: network2Marketplace.id,
          smartContractAddress: '0xMARKETPLACE',
          ownerWalletAddress: '0xOWNER',
          confirmedAt: new Date(),
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network1.id,
          sellerMarketplaceId: userMarketplace1.id,
          hash: '0x95b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677125',
          senderAddress: '',
          gas: 0,
          transactionFee: '',
        },
      })

      await prisma.sellerMarketplaceTransaction.create({
        data: {
          sellerId: user.id,
          networkId: network2.id,
          sellerMarketplaceId: userMarketplace2.id,
          hash: '0xc5b1b7825047a5e1fab83f7e56fbd39d8ca0e8f0de2af9cb23e072c3d0677126',
          senderAddress: '',
          gas: 0,
          transactionFee: '',
        },
      })

      bitQueryClient = new BitQueryClient(1)

      jest
        .spyOn(blockchainClientFactory, 'getClient')
        .mockReturnValue(bitQueryClient)

      const jestNetworkClient = new MarketplaceJestNetworkClient('jest')

      jest
        .spyOn(blockchainMarketplaceClientFactory, 'getClient')
        .mockReturnValue(jestNetworkClient)

      spyGetTransactions = jest
        .spyOn(bitQueryClient, 'getTransactions')
        .mockResolvedValue([])
    })

    it('does nothing', async () => {
      await updateUserMarketplaceTransactionsFromBlockchainNetwork(
        blockchainClientFactory,
        blockchainMarketplaceClientFactory,
        {
          ...request,
          networkMarketplaceId: network1Marketplace.id,
        }
      )

      expect(spyGetTransactions).toHaveBeenCalledTimes(0)
    })
  })
})
