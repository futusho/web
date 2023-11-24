import Link from 'next/link'
import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { Loader, Header, Grid } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { payouts as PayoutsAPI } from '@/lib/api/user/payouts'
import { CountdownTimer } from '@/screens/shared/components'
import type { UnconfirmedPayout } from '@/types/user-payouts'

interface Props {
  payout: UnconfirmedPayout
}

const pollingInterval = 60 * 1000

export default function Screen({ payout }: Props) {
  const router = useRouter()

  const [getPayoutTransactionStatusError, setGetPayoutTransactionStatusError] =
    useState<string>('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    let attempts = 0

    const getPayoutStatus = async () => {
      try {
        const response = await PayoutsAPI.getPayoutTransactionStatus(
          payout.id,
          payout.transactionId
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
            setGetPayoutTransactionStatusError(
              'Transaction has been failed. Please reload this page and try again.'
            )

            clearTimeout(timer)

            break
          }

          case 'awaiting_confirmation': {
            if (attempts++ >= 5) {
              attempts = 0

              setGetPayoutTransactionStatusError(
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
          setGetPayoutTransactionStatusError(e.message)
        } else {
          setGetPayoutTransactionStatusError(`${e}`)
        }
      }
    }

    if (payout.id) {
      timer = setInterval(getPayoutStatus, pollingInterval)
    }

    // Clean up the interval when the component unmounts or the payoutUpdated variable changes to false
    return () => {
      clearTimeout(timer)
    }
  }, [payout.id, payout.transactionId, router])

  return (
    <UserLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content="Waiting for a transaction confirmation..." />

          <Header as="h3">
            Your
            <a
              href={`${payout.networkBlockchainExplorerURL}/tx/${payout.transactionHash}`}
              target="_blank"
              rel="nofollow noreferrer noopener"
            >
              {' transaction '}
            </a>
            is already on the blockchain!
          </Header>
        </Grid.Column>

        {getPayoutTransactionStatusError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to get a confirmation status"
              content={getPayoutTransactionStatusError}
            />
          </Grid.Column>
        )}

        <Grid.Column textAlign="center">
          <p>
            Please note that the processing time for transactions on the
            blockchain typically ranges from 3 to 5 minutes.
          </p>

          <p>
            If you prefer not to wait, you can close this window. In this case,
            you will find your payout status in{' '}
            <Link href="/my/payouts">payouts</Link> section.
          </p>

          <Header as="h3">
            <CountdownTimer initialTime={300} />
          </Header>
        </Grid.Column>

        {!getPayoutTransactionStatusError && (
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
    </UserLayout>
  )
}
