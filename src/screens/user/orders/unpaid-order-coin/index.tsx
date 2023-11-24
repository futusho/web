import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import {
  Progress,
  Message,
  Button,
  Icon,
  Header,
  Grid,
  Table,
  Divider,
} from 'semantic-ui-react'
import {
  useBalance,
  useContractWrite,
  usePrepareContractWrite,
  useAccount,
} from 'wagmi'
import { ErrorMessage } from '@/components'
import { MainLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { orders as OrdersAPI } from '@/lib/api/user/orders'
import { sellerMarketplaceABI } from '@/lib/blockchain/generated'
import { reduceTransactionHash } from '@/lib/blockchain/helpers'
import type { BlockchainTransactionHash } from '@/types/blockchain'
import type { DraftOrderCoin, PendingOrderCoin } from '@/types/user-orders'
import { Checklist } from './checklist'
import { ConnectWallet } from './connect-wallet'
import { InsufficientFunds } from './insufficient-funds'
import { Sidebar } from './sidebar'

const isPendingOrder = (
  order: DraftOrderCoin | PendingOrderCoin
): order is PendingOrderCoin =>
  (order as PendingOrderCoin).priceInCoins !== undefined &&
  (order as PendingOrderCoin).transactions !== undefined

interface Props {
  order: DraftOrderCoin | PendingOrderCoin
}

export default function Screen({ order }: Props) {
  const router = useRouter()

  const [agreedWithTerms, setAgreedWithTerms] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)

  const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<BlockchainTransactionHash | null>(null)
  const [addOrderTransactionError, setAddOrderTransactionError] =
    useState<string>('')
  const [
    addOrderTransactionValidationErrors,
    setAddOrderTransactionValidationErrors,
  ] = useState<string[]>([])

  const { address: accountAddress, isConnected } = useAccount()

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    enabled: isConnected,
    address: accountAddress,
    chainId: order.networkChainId,
  })

  const isEnoughMoney = balance && balance.value > BigInt(order.priceInCoins)

  const { config: payOrderConfig, error: payOrderPrepareError } =
    usePrepareContractWrite({
      enabled: isPaymentEnabled,
      abi: sellerMarketplaceABI,
      functionName: 'payUsingCoin',
      address: order.sellerMarketplaceSmartContractAddress,
      chainId: order.networkChainId,
      args: [order.id, BigInt(order.priceInCoins)],
      account: accountAddress,
      gas: 1000000n,
      value: BigInt(order.priceInCoins),
    })

  const {
    write: writePayOrder,
    error: payError,
    isLoading: paymentProcessing,
    isSuccess: paymentProcessed,
  } = useContractWrite({
    ...payOrderConfig,
    onSuccess(data) {
      setTxHash(data.hash)
    },
  })

  const handlePay = () => {
    writePayOrder?.()
  }

  useEffect(() => {
    if (!txHash) return

    const addOrderTransaction = async () => {
      try {
        setAddOrderTransactionError('')
        setAddOrderTransactionValidationErrors([])

        const response = await OrdersAPI.addOrderTransaction(order.id, {
          tx_hash: txHash,
        })

        if (!response.data) {
          throw new Error('There is not data in API response')
        }

        router.reload()
      } catch (e) {
        if (e instanceof APIError) {
          setAddOrderTransactionError(e.message)
          setAddOrderTransactionValidationErrors(e.validationErrors)
        } else {
          setAddOrderTransactionError(`${e}`)
        }
      }
    }

    addOrderTransaction()
  }, [txHash, order.id, router])

  useEffect(() => {
    let p = 0

    if (agreedWithTerms) {
      p++

      if (isConnected) {
        p++

        if (balance) {
          p++

          if (isEnoughMoney) {
            p++

            if (isPaymentEnabled) {
              p++

              if (paymentProcessed) {
                p++
              }
            }
          }
        }
      }
    }

    setProgress(p)
  }, [
    agreedWithTerms,
    isConnected,
    balance,
    isEnoughMoney,
    isPaymentEnabled,
    paymentProcessed,
  ])

  return (
    <MainLayout>
      <Progress value={progress} total={6} attached="top" autoSuccess />

      <Grid container columns={2} stackable relaxed padded>
        <Grid.Column width={16} textAlign="center">
          <Header as="h1" content={order.productTitle} />
        </Grid.Column>

        <Grid.Column width={9}>
          {agreedWithTerms ? (
            <>
              {isConnected ? (
                <>
                  {balanceLoading ? (
                    <Header
                      as="h3"
                      content="Step 3 of 5: Loading account balance"
                    />
                  ) : (
                    <>
                      {balanceError ? (
                        <>
                          <Header
                            as="h3"
                            content="Step 3 of 5: Loading account balance"
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
                                content="Step 4 of 5: We are ready to process your payment"
                              />

                              {payOrderPrepareError && (
                                <ErrorMessage
                                  header="Unable to prepare payment"
                                  content={payOrderPrepareError.message}
                                />
                              )}

                              {payError && (
                                <ErrorMessage
                                  header="Unable to pay"
                                  content={payError.message}
                                />
                              )}

                              {addOrderTransactionError && (
                                <ErrorMessage
                                  header="Unable to add order transaction"
                                  content={addOrderTransactionError}
                                />
                              )}

                              {addOrderTransactionValidationErrors.length >
                                0 && (
                                <Message
                                  icon="ban"
                                  error
                                  header="Unable to add order transaction"
                                  list={addOrderTransactionValidationErrors}
                                />
                              )}

                              <p>
                                Review the payment amount and proceed to make
                                your payment. Confirm the transaction within
                                your wallet interface to ensure a successful
                                transaction. Please note that the processing
                                time for transactions on the blockchain
                                typically ranges from 3 to 5 minutes.
                              </p>

                              <p>
                                During this time, the blockchain network
                                verifies and confirms the transaction. Rest
                                assured that we are working diligently to ensure
                                a seamless and secure experience for you. We
                                appreciate your patience, and if you have any
                                questions or need further assistance, please
                                don&apos;t hesitate to reach out to our support
                                team.
                              </p>

                              <p>
                                Once you click the &quot;Pay&quot; button on the
                                next step, your connected wallet interface will
                                appear on the screen. You will be required to
                                review the transaction details and sign the
                                transaction within your wallet to authorize the
                                payment. This additional step ensures the
                                security and integrity of the transaction
                                process.
                              </p>

                              <p>
                                <b>
                                  Thank you for your cooperation in completing
                                  this necessary verification step.
                                </b>
                              </p>

                              {isPaymentEnabled ? (
                                <Button
                                  primary
                                  size="big"
                                  content={`Pay ${order.priceFormatted}`}
                                  loading={paymentProcessing}
                                  disabled={
                                    paymentProcessing || paymentProcessed
                                  }
                                  onClick={() => handlePay()}
                                />
                              ) : (
                                <Button
                                  positive
                                  size="big"
                                  content="Yes, I understand"
                                  onClick={() => setIsPaymentEnabled(true)}
                                />
                              )}
                            </>
                          ) : (
                            <InsufficientFunds order={order} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <ConnectWallet networkChainId={order.networkChainId} />
              )}
            </>
          ) : (
            <>
              <Header as="h3" content="How does our payment system work?" />

              <p>
                Please refer to the following checklist for a step-by-step guide
                on how to proceed with your payment. We will guide you through
                each step to have a better experience with purchasing{' '}
                {order.productTitle}.
              </p>

              <Checklist order={order} />

              <Divider hidden />

              <Button
                size="big"
                positive
                onClick={() => setAgreedWithTerms(true)}
                content="Yes, I understand"
              />
            </>
          )}
        </Grid.Column>

        <Grid.Column width={1}>
          <Divider vertical>
            <Icon name="heart" color="red" />
          </Divider>
        </Grid.Column>

        <Grid.Column width={6}>
          <Sidebar order={order} />
        </Grid.Column>

        {isPendingOrder(order) && order.transactions.length > 0 && (
          <Grid.Column width={16}>
            <Header as="h3" content="Transactions history" />

            <Table>
              <Table.Header>
                <Table.HeaderCell>Hash</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
              </Table.Header>

              <Table.Body>
                {order.transactions.map((transaction) => (
                  <Table.Row key={transaction.transactionHash}>
                    <Table.Cell>
                      <a
                        href={`${order.networkBlockchainExplorerURL}/tx/${transaction.transactionHash}`}
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
    </MainLayout>
  )
}
