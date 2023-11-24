import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  CancelledPayoutMustNotHaveConfirmedTransactions,
  CancelledPayoutMustNotHavePendingTransactions,
  ConfirmedPayoutDoesNotHaveConfirmedTransaction,
  ConfirmedPayoutTransactionDoesNotHaveGas,
  ConfirmedPayoutTransactionDoesNotHaveTransactionFee,
  DraftPayoutMustNotHaveTransactions,
  getUserPayoutBasedOnStatus,
  PayoutDoesNotExist,
  PendingPayoutMustHaveTransactions,
  PendingPayoutMustNotHaveConfirmedTransactions,
  SellerMarketplaceDoesNotHaveValidOwnerWalletAddress,
  SellerMarketplaceDoesNotHaveValidSmartContractAddress,
  UserDoesNotExist,
} from '@/useCases/getUserPayoutBasedOnStatus'
import { cleanDatabase } from '../helpers'
import type {
  Network,
  NetworkMarketplace,
  NetworkMarketplaceToken,
  SellerPayout,
  SellerPayoutTransaction,
  User,
} from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserPayoutBasedOnStatus', () => {
  const request = {
    userId: uuidv4(),
    userPayoutId: uuidv4(),
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserPayoutBasedOnStatus({
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

  describe('when userPayoutId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserPayoutBasedOnStatus({
          ...request,
          userPayoutId: 'not-an-uuid',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userPayoutId: Invalid uuid',
        ])
      }
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserPayoutBasedOnStatus({
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

  describe('when payout does not exist', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserPayoutBasedOnStatus({
          ...request,
          userId: user.id,
          userPayoutId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(PayoutDoesNotExist)
        expect((e as PayoutDoesNotExist).message).toEqual(
          'Payout does not exist'
        )
      }
    })
  })

  describe('when requested payout belongs to another user', () => {
    let user: User, anotherUserPayout: SellerPayout

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

      anotherUserPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: anotherUser.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceToken.id,
          amount: '1233.09391929',
          amountFormatted: '1233.09391929 COIN',
          decimals: 18,
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserPayoutBasedOnStatus({
          ...request,
          userId: user.id,
          userPayoutId: anotherUserPayout.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(PayoutDoesNotExist)
        expect((e as PayoutDoesNotExist).message).toEqual(
          'Payout does not exist'
        )
      }
    })
  })

  describe('when payout is draft', () => {
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
      let userPayout: SellerPayout

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
            ownerWalletAddress: '0xWALLET',
          },
        })

        const userMarketplaceCoin = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace.id,
            networkMarketplaceTokenId: networkMarketplaceCoin.id,
          },
        })

        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '0.1',
            amountFormatted: '0.1 COIN',
            decimals: 18,
          },
        })

        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(DraftPayoutMustNotHaveTransactions)
          expect((e as DraftPayoutMustNotHaveTransactions).message).toEqual(
            'Draft payout must not have transactions'
          )
        }
      })
    })

    describe('when coin', () => {
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              amount: '0.1',
              amountFormatted: '0.1 COIN',
              decimals: 18,
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              amount: '0.1',
              amountFormatted: '0.1 COIN',
              decimals: 18,
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              amount: '1234.09391929',
              amountFormatted: '1234.09391929 COIN',
              decimals: 18,
            },
          })
        })

        it('returns draft payout', async () => {
          const payout = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(payout).toEqual({
            id: userPayout.id,
            amountFormatted: '1234.09391929 COIN',
            amountInCoins: '1234093919290000000000',
            networkChainId: 1,
            networkBlockchainExplorerURL: 'https://localhost',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
          })
        })
      })
    })

    describe('when ERC20 token', () => {
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '0.1',
              amountFormatted: '0.1 TOKEN',
              decimals: 18,
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '0.1',
              amountFormatted: '0.1 TOKEN',
              decimals: 18,
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1234.09391929',
              amountFormatted: '1234.09391929 TOKEN',
              decimals: 18,
            },
          })
        })

        it('returns draft payout', async () => {
          const payout = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(payout).toEqual({
            id: userPayout.id,
            amountFormatted: '1234.09391929 TOKEN',
            amountInTokens: '1234093919290000000000',
            networkChainId: 1,
            networkBlockchainExplorerURL: 'https://localhost',
            tokenSmartContractAddress:
              '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
          })
        })
      })
    })
  })

  describe('when payout is pending', () => {
    describe('when there are no transactions', () => {
      let user: User, userPayout: SellerPayout

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

        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '1234.09391929',
            amountFormatted: '1234.09391929 COIN',
            decimals: 18,
            pendingAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(PendingPayoutMustHaveTransactions)
          expect((e as PendingPayoutMustHaveTransactions).message).toEqual(
            'Pending payout must have transactions'
          )
        }
      })
    })

    describe('when there is confirmed transaction', () => {
      let user: User, userPayout: SellerPayout

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

        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '1234.09391929',
            amountFormatted: '1234.09391929 COIN',
            decimals: 18,
            pendingAt: new Date(),
          },
        })

        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            PendingPayoutMustNotHaveConfirmedTransactions
          )
          expect(
            (e as PendingPayoutMustNotHaveConfirmedTransactions).message
          ).toEqual('Pending payout must not have confirmed transactions')
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceCoin.id,
              amount: '1234.09391929',
              amountFormatted: '1234.09391929 COIN',
              decimals: 18,
              pendingAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns pending payout', async () => {
          const payout = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(payout).toEqual({
            id: userPayout.id,
            amountFormatted: '1234.09391929 COIN',
            amountInCoins: '1234093919290000000000',
            networkChainId: 1,
            networkBlockchainExplorerURL: 'https://localhost',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
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
        let userPayout: SellerPayout

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

          userPayout = await prisma.sellerPayout.create({
            data: {
              sellerId: user.id,
              sellerMarketplaceId: userMarketplace.id,
              sellerMarketplaceTokenId: userMarketplaceToken.id,
              amount: '1234.09391929',
              amountFormatted: '1234.09391929 TOKEN',
              decimals: 18,
              pendingAt: new Date(),
            },
          })

          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              failedAt: new Date('2023-10-04T12:16:00.000Z'),
            },
          })
        })

        it('returns pending payout', async () => {
          const payout = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(payout).toEqual({
            id: userPayout.id,
            amountFormatted: '1234.09391929 TOKEN',
            amountInTokens: '1234093919290000000000',
            networkChainId: 1,
            networkBlockchainExplorerURL: 'https://localhost',
            tokenSmartContractAddress:
              '0xaa25aa7a19f9c426e07dee59b12f944f4d9f1dd3',
            sellerMarketplaceSmartContractAddress:
              '0x1fd6a75cc72f39147756a663f3ef1fc95ef89495',
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
      let user: User,
        userPayout: SellerPayout,
        pendingTransaction: SellerPayoutTransaction

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

        userPayout = await prisma.sellerPayout.create({
          data: {
            sellerId: user.id,
            sellerMarketplaceId: userMarketplace.id,
            sellerMarketplaceTokenId: userMarketplaceCoin.id,
            amount: '1234.09391929',
            amountFormatted: '1234.09391929 COIN',
            decimals: 18,
            pendingAt: new Date(),
          },
        })

        pendingTransaction = await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
          },
        })
      })

      it('returns unconfirmed payout', async () => {
        const payout = await getUserPayoutBasedOnStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
        })

        expect(payout).toEqual({
          id: userPayout.id,
          networkBlockchainExplorerURL: 'https://localhost',
          transactionId: pendingTransaction.id,
          transactionHash: '0xHASH',
        })
      })
    })
  })

  describe('when payout is cancelled', () => {
    let user: User, network: Network, userPayout: SellerPayout

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

      userPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          amount: '1234.09391929',
          amountFormatted: '1234.09391929 COIN',
          decimals: 18,
          cancelledAt: new Date('2023-10-03T12:16:00.000Z'),
        },
      })
    })

    describe('when there are no transactions', () => {
      it('returns cancelled payout', async () => {
        const payout = await getUserPayoutBasedOnStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
        })

        expect(payout).toEqual({
          cancelledAt: '2023-10-03T12:16:00.000Z',
        })
      })
    })

    describe('when there is failed transaction', () => {
      beforeEach(async () => {
        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            failedAt: new Date(),
          },
        })
      })

      it('returns cancelled payout', async () => {
        const payout = await getUserPayoutBasedOnStatus({
          ...request,
          userId: user.id,
          userPayoutId: userPayout.id,
        })

        expect(payout).toEqual({
          cancelledAt: '2023-10-03T12:16:00.000Z',
        })
      })
    })

    describe('when there is pending transaction', () => {
      beforeEach(async () => {
        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            CancelledPayoutMustNotHavePendingTransactions
          )
          expect(
            (e as CancelledPayoutMustNotHavePendingTransactions).message
          ).toEqual('Cancelled payout must not have pending transactions')
        }
      })
    })

    describe('when there is confirmed transaction', () => {
      beforeEach(async () => {
        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            confirmedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            CancelledPayoutMustNotHaveConfirmedTransactions
          )
          expect(
            (e as CancelledPayoutMustNotHaveConfirmedTransactions).message
          ).toEqual('Cancelled payout must not have confirmed transactions')
        }
      })
    })
  })

  describe('when payout is confirmed', () => {
    let user: User, network: Network, userPayout: SellerPayout

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

      userPayout = await prisma.sellerPayout.create({
        data: {
          sellerId: user.id,
          sellerMarketplaceId: userMarketplace.id,
          sellerMarketplaceTokenId: userMarketplaceCoin.id,
          amount: '1234.09391929',
          amountFormatted: '1234.09391929 COIN',
          decimals: 18,
          confirmedAt: new Date('2023-10-04T12:16:00.000Z'),
        },
      })
    })

    describe('when there are no transactions', () => {
      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            ConfirmedPayoutDoesNotHaveConfirmedTransaction
          )
          expect(
            (e as ConfirmedPayoutDoesNotHaveConfirmedTransaction).message
          ).toEqual('Confirmed payout does not have confirmed transaction')
        }
      })
    })

    describe('when there is failed transaction', () => {
      beforeEach(async () => {
        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            failedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            ConfirmedPayoutDoesNotHaveConfirmedTransaction
          )
          expect(
            (e as ConfirmedPayoutDoesNotHaveConfirmedTransaction).message
          ).toEqual('Confirmed payout does not have confirmed transaction')
        }
      })
    })

    describe('when there is pending transaction', () => {
      beforeEach(async () => {
        await prisma.sellerPayoutTransaction.create({
          data: {
            sellerPayoutId: userPayout.id,
            networkId: network.id,
            hash: '0xHASH',
            failedAt: new Date(),
          },
        })
      })

      it('returns error', async () => {
        expect.assertions(3)

        try {
          const result = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(result).toBeNull()
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServerError)
          expect(e).toBeInstanceOf(
            ConfirmedPayoutDoesNotHaveConfirmedTransaction
          )
          expect(
            (e as ConfirmedPayoutDoesNotHaveConfirmedTransaction).message
          ).toEqual('Confirmed payout does not have confirmed transaction')
        }
      })
    })

    describe('when there is confirmed transaction', () => {
      describe('when there is no gas', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(ConfirmedPayoutTransactionDoesNotHaveGas)
            expect(
              (e as ConfirmedPayoutTransactionDoesNotHaveGas).message
            ).toEqual('Confirmed payout transaction does not have gas')
          }
        })
      })

      describe('when there is no transaction fee', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              gas: 123456,
              confirmedAt: new Date(),
            },
          })
        })

        it('returns error', async () => {
          expect.assertions(3)

          try {
            const result = await getUserPayoutBasedOnStatus({
              ...request,
              userId: user.id,
              userPayoutId: userPayout.id,
            })

            expect(result).toBeNull()
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServerError)
            expect(e).toBeInstanceOf(
              ConfirmedPayoutTransactionDoesNotHaveTransactionFee
            )
            expect(
              (e as ConfirmedPayoutTransactionDoesNotHaveTransactionFee).message
            ).toEqual(
              'Confirmed payout transaction does not have transaction fee'
            )
          }
        })
      })

      describe('when everything is good', () => {
        beforeEach(async () => {
          await prisma.sellerPayoutTransaction.create({
            data: {
              sellerPayoutId: userPayout.id,
              networkId: network.id,
              hash: '0xHASH',
              gas: 123456,
              transactionFee: '0.099919',
              confirmedAt: new Date(),
            },
          })
        })

        it('returns confirmed payout', async () => {
          const payout = await getUserPayoutBasedOnStatus({
            ...request,
            userId: user.id,
            userPayoutId: userPayout.id,
          })

          expect(payout).toEqual({
            confirmedAt: '2023-10-04T12:16:00.000Z',
            gas: 123456,
            transactionFee: '0.099919',
          })
        })
      })
    })
  })
})
