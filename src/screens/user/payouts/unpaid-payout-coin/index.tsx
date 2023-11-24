import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import {
  Message,
  Button,
  Header,
  Grid,
  Table,
  Checkbox,
} from 'semantic-ui-react'
import {
  useBalance,
  useContractWrite,
  usePrepareContractWrite,
  useAccount,
} from 'wagmi'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { payouts as PayoutsAPI } from '@/lib/api/user/payouts'
import { sellerMarketplaceABI } from '@/lib/blockchain/generated'
import { reduceTransactionHash } from '@/lib/blockchain/helpers'
import type { BlockchainTransactionHash } from '@/types/blockchain'
import type { DraftPayoutCoin, PendingPayoutCoin } from '@/types/user-payouts'
import { ConnectWallet } from './connect-wallet'

const isPendingPayout = (
  payout: DraftPayoutCoin | PendingPayoutCoin
): payout is PendingPayoutCoin =>
  (payout as PendingPayoutCoin).amountInCoins !== undefined &&
  (payout as PendingPayoutCoin).transactions !== undefined

interface Props {
  payout: DraftPayoutCoin | PendingPayoutCoin
}

export default function Screen({ payout }: Props) {
  const router = useRouter()

  const [isClaimEnabled, setIsClaimEnabled] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<BlockchainTransactionHash | null>(null)
  const [addPayoutTransactionError, setAddPayoutTransactionError] =
    useState<string>('')
  const [
    addPayoutTransactionValidationErrors,
    setAddPayoutTransactionValidationErrors,
  ] = useState<string[]>([])

  const { address: accountAddress, isConnected } = useAccount()

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    enabled: isConnected,
    address: accountAddress,
    chainId: payout.networkChainId,
  })

  const isEnoughMoney = balance && balance.value > 0

  const { config: withdrawCoinsConfig, error: withdrawCoinsPrepareError } =
    usePrepareContractWrite({
      enabled: isClaimEnabled,
      abi: sellerMarketplaceABI,
      functionName: 'withdrawCoinsAmount',
      address: payout.sellerMarketplaceSmartContractAddress,
      chainId: payout.networkChainId,
      args: [BigInt(payout.amountInCoins)],
      account: accountAddress,
      gas: 1000000n,
    })

  const {
    write: writeWithdrawCoins,
    error: withdrawCoinsError,
    isLoading: withdrawProcessing,
    isSuccess: withdrawProcessed,
  } = useContractWrite({
    ...withdrawCoinsConfig,
    onSuccess(data) {
      setTxHash(data.hash)
    },
  })

  const handleClaim = () => {
    writeWithdrawCoins?.()
  }

  useEffect(() => {
    if (!txHash) return

    const addPayoutTransaction = async () => {
      try {
        setAddPayoutTransactionError('')
        setAddPayoutTransactionValidationErrors([])

        const response = await PayoutsAPI.addPayoutTransaction(payout.id, {
          tx_hash: txHash,
        })

        if (!response.data) {
          throw new Error('There is not data in API response')
        }

        router.reload()
      } catch (e) {
        if (e instanceof APIError) {
          setAddPayoutTransactionError(e.message)
          setAddPayoutTransactionValidationErrors(e.validationErrors)
        } else {
          setAddPayoutTransactionError(`${e}`)
        }
      }
    }

    addPayoutTransaction()
  }, [txHash, payout.id, router])

  return (
    <UserLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header
            as="h1"
            content={`Claim your funds: ${payout.amountFormatted}`}
          />
        </Grid.Column>

        <Grid.Column>
          {isConnected ? (
            <>
              {balanceLoading ? (
                <Header as="h3" content="Loading account balance" />
              ) : (
                <>
                  {balanceError ? (
                    <>
                      <Header
                        as="h3"
                        content="Loading account balance"
                        color="red"
                      />

                      <ErrorMessage
                        header="Unable to load balance"
                        content={balanceError.message}
                      />
                    </>
                  ) : (
                    <>
                      {isEnoughMoney ? (
                        <>
                          <Header
                            as="h3"
                            content="Everything is great to process your withdrawal"
                          />

                          {withdrawCoinsPrepareError && (
                            <ErrorMessage
                              header="Unable to prepare withdrawal"
                              content={withdrawCoinsPrepareError.message}
                            />
                          )}

                          {withdrawCoinsError && (
                            <ErrorMessage
                              header="Unable to claim funds"
                              content={withdrawCoinsError.message}
                            />
                          )}

                          {addPayoutTransactionError && (
                            <ErrorMessage
                              header="Unable to add payout transaction"
                              content={addPayoutTransactionError}
                            />
                          )}

                          {addPayoutTransactionValidationErrors.length > 0 && (
                            <Message
                              icon="ban"
                              error
                              header="Unable to add payout transaction"
                              list={addPayoutTransactionValidationErrors}
                            />
                          )}

                          <p>
                            When you click &quot;Claim&quot;, your connected
                            wallet interface will pop up. Review the transaction
                            details and sign it within your wallet. Typically,
                            blockchain transactions take 3-5 minutes. During
                            this time, the blockchain network ensures the
                            transaction&apos;s security and authenticity.
                            We&apos;re committed to providing a smooth and
                            secure experience.
                          </p>

                          <p>
                            Your patience is appreciated, and if you have any
                            questions, our support team is here to assist you.
                          </p>

                          <p>
                            <b>
                              Thank you for your cooperation in completing this
                              necessary verification step.
                            </b>
                          </p>

                          <p>
                            <Checkbox
                              toggle
                              onChange={(_e, data) =>
                                setIsClaimEnabled(!!data.checked)
                              }
                              label="Yes, I understand"
                              disabled={withdrawProcessing || withdrawProcessed}
                            />
                          </p>

                          <Button
                            primary
                            size="big"
                            content={`Claim ${payout.amountFormatted}`}
                            loading={withdrawProcessing}
                            disabled={
                              !isClaimEnabled ||
                              withdrawProcessing ||
                              withdrawProcessed
                            }
                            onClick={() => handleClaim()}
                          />
                        </>
                      ) : (
                        <p>
                          You don&apos;t have enough tokens to pay for gas fee
                          on the blockchain.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <ConnectWallet networkChainId={payout.networkChainId} />
          )}
        </Grid.Column>

        {isPendingPayout(payout) && payout.transactions.length > 0 && (
          <Grid.Column>
            <Header as="h3" content="Transactions history" />

            <Table>
              <Table.Header>
                <Table.HeaderCell>Hash</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
              </Table.Header>

              <Table.Body>
                {payout.transactions.map((transaction) => (
                  <Table.Row key={transaction.transactionHash}>
                    <Table.Cell>
                      <a
                        href={`${payout.networkBlockchainExplorerURL}/tx/${transaction.transactionHash}`}
                        target="_blank"
                        rel="nofollow noreferrer noopener"
                      >
                        {reduceTransactionHash(transaction.transactionHash)}
                      </a>
                    </Table.Cell>
                    <Table.Cell>{transaction.status}</Table.Cell>
                    <Table.Cell>
                      {new Date(transaction.date).toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Grid.Column>
        )}
      </Grid>
    </UserLayout>
  )
}
