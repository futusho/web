import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { Loader, Header, Grid } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { MainLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { orders as OrdersAPI } from '@/lib/api/user/orders'
import { CountdownTimer } from '@/screens/shared/components'
import type { UnconfirmedOrder } from '@/types/user-orders'

interface Props {
  order: UnconfirmedOrder
}

const pollingInterval = 60 * 1000

export default function Screen({ order }: Props) {
  const router = useRouter()

  const [getOrderTransactionStatusError, setGetOrderTransactionStatusError] =
    useState<string>('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    let attempts = 0

    const getOrderStatus = async () => {
      try {
        const response = await OrdersAPI.getOrderTransactionStatus(
          order.id,
          order.transactionId
        )

        if (!response.data) {
          throw new Error('There is not data in API response')
        }

        const data = response.data

        switch (data.status) {
          case 'confirmed': {
            clearTimeout(timer)

            router.reload()
            break
          }

          case 'failed': {
            setGetOrderTransactionStatusError(
              'Transaction has been failed. Please reload this page and try again.'
            )

            clearTimeout(timer)

            break
          }

          case 'awaiting_confirmation': {
            if (attempts++ >= 5) {
              attempts = 0

              setGetOrderTransactionStatusError(
                "We're currently unable to confirm your transaction. Kindly refresh this page, and we'll make every effort to retrieve updates for you."
              )
            }
            break
          }

          default: {
            throw new Error(`Unsupported transaction status: ${data.status}`)
          }
        }
      } catch (e) {
        if (e instanceof APIError) {
          setGetOrderTransactionStatusError(e.message)
        } else {
          setGetOrderTransactionStatusError(`${e}`)
        }
      }
    }

    if (order.id) {
      timer = setInterval(getOrderStatus, pollingInterval)
    }

    // Clean up the interval when the component unmounts or the orderUpdated variable changes to false
    return () => {
      clearTimeout(timer)
    }
  }, [order.id, order.transactionId, router])

  return (
    <MainLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content={order.productTitle} />

          <Header as="h3">
            Your
            <a
              href={`${order.networkBlockchainExplorerURL}/tx/${order.transactionHash}`}
              target="_blank"
              rel="nofollow noreferrer noopener"
            >
              {' transaction '}
            </a>
            is already on the blockchain!
          </Header>
        </Grid.Column>

        {getOrderTransactionStatusError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to get a confirmation status"
              content={getOrderTransactionStatusError}
            />
          </Grid.Column>
        )}

        <Grid.Column textAlign="center">
          <p>
            Please note that the processing time for transactions on the
            blockchain typically ranges from 3 to 5 minutes.
            <br />
            Once confirmed, you will gain immediate access to your purchased
            product.
          </p>

          <p>
            If you prefer not to wait, you can close this window. In this case,
            you will find your product in your{' '}
            <Link href="/my/orders">orders</Link> section.
          </p>

          <Header as="h3">
            <CountdownTimer initialTime={300} />
          </Header>
        </Grid.Column>

        {!getOrderTransactionStatusError && (
          <Grid.Column textAlign="center">
            <Loader
              active
              inline
              size="large"
              content="Waiting for confirmation..."
            />
          </Grid.Column>
        )}
      </Grid>
    </MainLayout>
  )
}
