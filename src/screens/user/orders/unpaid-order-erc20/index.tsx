import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import {
  Progress,
  Message,
  Button,
  Icon,
  Divider,
  Header,
  Grid,
  Table,
  Checkbox,
} from 'semantic-ui-react'
import { zeroAddress } from 'viem'
import {
  useBalance,
  useContractWrite,
  usePrepareContractWrite,
  useAccount,
  useContractRead,
  erc20ABI,
} from 'wagmi'
import { ErrorMessage } from '@/components'
import { MainLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { orders as OrdersAPI } from '@/lib/api/user/orders'
import { sellerMarketplaceABI } from '@/lib/blockchain/generated'
import { reduceTransactionHash } from '@/lib/blockchain/helpers'
import type {
  BlockchainAddress,
  BlockchainTransactionHash,
} from '@/types/blockchain'
import type { DraftOrderERC20, PendingOrderERC20 } from '@/types/user-orders'
import { Checklist } from './checklist'
import { ConnectWallet } from './connect-wallet'
import { InsufficientFunds } from './insufficient-funds'
import { Sidebar } from './sidebar'

const isPendingOrder = (
  order: DraftOrderERC20 | PendingOrderERC20
): order is PendingOrderERC20 =>
  (order as PendingOrderERC20).priceInTokens !== undefined &&
  (order as PendingOrderERC20).transactions !== undefined

interface Props {
  order: DraftOrderERC20 | PendingOrderERC20
}

export default function Screen({ order }: Props) {
  const router = useRouter()

  const [agreedWithTerms, setAgreedWithTerms] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)

  const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(false)
  const [isApproveEnabled, setIsApproveEnabled] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<BlockchainTransactionHash | null>(null)
  const [addOrderTransactionError, setAddOrderTransactionError] =
    useState<string>('')
  const [
    addOrderTransactionValidationErrors,
    setAddOrderTransactionValidationErrors,
  ] = useState<string[]>([])
  const [allowanceReached, setAllowanceReached] = useState<boolean>(false)

  const { address: accountAddress, isConnected } = useAccount()

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    enabled: isConnected,
    address: accountAddress,
    chainId: order.networkChainId,
    token: order.tokenSmartContractAddress,
  })

  const { error: allowanceError, isLoading: allowanceLoading } =
    useContractRead({
      enabled: isConnected,
      address: order.tokenSmartContractAddress,
      abi: erc20ABI,
      functionName: 'allowance',
      chainId: order.networkChainId,
      args: [
        accountAddress ? (accountAddress as BlockchainAddress) : zeroAddress,
        order.sellerMarketplaceSmartContractAddress,
      ],
      onSuccess(allowedTokens) {
        setAllowanceReached(allowedTokens >= BigInt(order.priceInTokens))
      },
    })

  const isEnoughMoney = balance && balance.value >= BigInt(order.priceInTokens)

  const { config: approveTokensConfig, error: approveTokensPrepareError } =
    usePrepareContractWrite({
      enabled: isApproveEnabled,
      abi: erc20ABI,
      functionName: 'approve',
      address: order.tokenSmartContractAddress,
      chainId: order.networkChainId,
      args: [
        order.sellerMarketplaceSmartContractAddress,
        BigInt(order.priceInTokens),
      ],
      account: accountAddress,
      gas: 1000000n,
    })

  const {
    write: writeApproveTokens,
    error: approveTokensError,
    isLoading: approveTokensProcessing,
  } = useContractWrite({
    ...approveTokensConfig,
    onSuccess() {
      setAllowanceReached(true)
    },
  })

  const { config: payOrderConfig, error: payOrderPrepareError } =
    usePrepareContractWrite({
      enabled: isPaymentEnabled,
      abi: sellerMarketplaceABI,
      functionName: 'payUsingToken',
      address: order.sellerMarketplaceSmartContractAddress,
      chainId: order.networkChainId,
      args: [
        order.id,
        BigInt(order.priceInTokens),
        order.tokenSmartContractAddress,
      ],
      account: accountAddress,
      gas: 1000000n,
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

  const handleApproveTokens = () => {
    writeApproveTokens?.()
  }

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

            if (allowanceReached) {
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
    }

    setProgress(p)
  }, [
    agreedWithTerms,
    isConnected,
    balance,
    isEnoughMoney,
    allowanceReached,
    isPaymentEnabled,
    paymentProcessed,
  ])

  return (
    <MainLayout>
      <Progress value={progress} total={7} attached="top" autoSuccess />

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
                      content="Step 3 of 7: Loading account balance"
                    />
                  ) : (
                    <>
                      {balanceError ? (
                        <>
                          <Header
                            as="h3"
                            content="Step 3 of 7: Loading account balance"
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
                              {allowanceLoading ? (
                                <Header
                                  as="h3"
                                  content="Step 5 of 7: Loading tokens allowance"
                                />
                              ) : (
                                <>
                                  {allowanceError ? (
                                    <>
                                      <Header
                                        as="h3"
                                        content="Step 5 of 7: Loading tokens allowance"
                                        color="red"
                                      />

                                      <ErrorMessage
                                        header="Unable to load tokens allowance"
                                        content={allowanceError.message}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      {allowanceReached ? (
                                        <>
                                          <Header
                                            as="h3"
                                            content="Step 6 of 7: We are ready to process your payment"
                                          />

                                          {payOrderPrepareError && (
                                            <ErrorMessage
                                              header="Unable to prepare payment"
                                              content={
                                                payOrderPrepareError.message
                                              }
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
                                              list={
                                                addOrderTransactionValidationErrors
                                              }
                                            />
                                          )}

                                          <p>
                                            Review the payment amount and
                                            proceed to make your payment.
                                            Confirm the transaction within your
                                            wallet interface to ensure a
                                            successful transaction. Please note
                                            that the processing time for
                                            transactions on the blockchain
                                            typically ranges from 3 to 5
                                            minutes.
                                          </p>

                                          <p>
                                            During this time, the blockchain
                                            network verifies and confirms the
                                            transaction. Rest assured that we
                                            are working diligently to ensure a
                                            seamless and secure experience for
                                            you. We appreciate your patience,
                                            and if you have any questions or
                                            need further assistance, please
                                            don&apos;t hesitate to reach out to
                                            our support team.
                                          </p>

                                          <p>
                                            Once you click the &quot;Pay&quot;{' '}
                                            button on the next step, your
                                            connected wallet interface will
                                            appear on the screen. You will be
                                            required to review the transaction
                                            details and sign the transaction
                                            within your wallet to authorize the
                                            payment. This additional step
                                            ensures the security and integrity
                                            of the transaction process.
                                          </p>

                                          <p>
                                            <b>
                                              Thank you for your cooperation in
                                              completing this necessary
                                              verification step.
                                            </b>
                                          </p>

                                          <p>
                                            <Checkbox
                                              toggle
                                              onChange={(_e, data) =>
                                                setIsPaymentEnabled(
                                                  !!data.checked
                                                )
                                              }
                                              label="Yes, I understand"
                                              disabled={
                                                paymentProcessing ||
                                                paymentProcessed
                                              }
                                            />
                                          </p>

                                          <Button
                                            primary
                                            size="big"
                                            content={`Pay ${order.priceFormatted}`}
                                            loading={paymentProcessing}
                                            disabled={
                                              !isPaymentEnabled ||
                                              paymentProcessing ||
                                              paymentProcessed
                                            }
                                            onClick={() => handlePay()}
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <Header
                                            as="h3"
                                            content="Step 5 of 7: You don't have enough token allowance"
                                            color="red"
                                          />

                                          <p>
                                            We&apos;re sorry to inform you that
                                            we currently don&apos;t have access
                                            to your tokens to process your order
                                            on our marketplace. We understand
                                            that this may be disappointing.
                                          </p>

                                          <p>
                                            To buy products from our sellers,
                                            you&apos;ll need to approve{' '}
                                            {order.priceFormatted} tokens from
                                            your account. Please click the
                                            button below to grant our smart
                                            contract access to your tokens.
                                          </p>

                                          <p>
                                            In the next step, you will be asked
                                            to confirm the transaction with the
                                            only required amount of tokens for
                                            your purchase.
                                          </p>

                                          {approveTokensPrepareError && (
                                            <ErrorMessage
                                              header="Unable to prepare tokens approval"
                                              content={
                                                approveTokensPrepareError.message
                                              }
                                            />
                                          )}

                                          {approveTokensError && (
                                            <ErrorMessage
                                              header="Unable to approve tokens"
                                              content={
                                                approveTokensError.message
                                              }
                                            />
                                          )}

                                          <p>
                                            <Checkbox
                                              toggle
                                              onChange={(_e, data) =>
                                                setIsApproveEnabled(
                                                  !!data.checked
                                                )
                                              }
                                              label="Yes, I understand"
                                            />
                                          </p>

                                          <Button
                                            primary
                                            size="big"
                                            disabled={!isApproveEnabled}
                                            content={`Approve ${order.priceFormatted}`}
                                            loading={approveTokensProcessing}
                                            onClick={() =>
                                              handleApproveTokens()
                                            }
                                          />
                                        </>
                                      )}
                                    </>
                                  )}
                                </>
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
