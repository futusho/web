import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { Grid, Loader, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { marketplaces as MarketplacesAPI } from '@/lib/api/user/marketplaces'
import { CountdownTimer } from '@/screens/shared/components'
import type { UnconfirmedMarketplace } from '@/types/user-marketplaces'

interface Props {
  marketplace: UnconfirmedMarketplace
}

const pollingInterval = 60 * 1000

const Screen = ({ marketplace }: Props) => {
  const router = useRouter()

  const [getMarketplaceStatusError, setGetMarketplaceStatusError] =
    useState<string>('')

  useEffect(() => {
    let timer: NodeJS.Timeout
    let attempts = 0

    // FIXME: Check if transaction were not confirmed in 5 minutes, handle this case.
    const getMarketplaceStatus = async () => {
      try {
        const response = await MarketplacesAPI.getMarketplaceStatus(
          marketplace.id
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
            setGetMarketplaceStatusError(
              'Transaction has been failed. Please reload this page and try again.'
            )

            clearTimeout(timer)

            break
          }

          case 'awaiting_confirmation': {
            if (attempts++ >= 5) {
              attempts = 0

              setGetMarketplaceStatusError(
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
          setGetMarketplaceStatusError(e.message)
        } else {
          setGetMarketplaceStatusError(`${e}`)
        }
      }
    }

    if (marketplace.id) {
      timer = setInterval(getMarketplaceStatus, pollingInterval)
    }

    return () => {
      clearTimeout(timer)
    }
  }, [marketplace.id, router])

  return (
    <UserLayout>
      <Header
        as="h1"
        content={`Marketplace on ${marketplace.networkTitle}`}
        textAlign="center"
      />

      <Grid stackable columns={1}>
        <Grid.Column textAlign="center">
          <Header as="h3" textAlign="center">
            Your
            <a
              href={`${marketplace.blockchainExplorerURL}/tx/${marketplace.transactionHash}`}
              target="_blank"
              rel="nofollow noreferrer noopener"
            >
              {' marketplace '}
            </a>
            is already on the blockchain!
          </Header>
        </Grid.Column>

        {getMarketplaceStatusError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to get marketplace status"
              content={getMarketplaceStatusError}
            />
          </Grid.Column>
        )}

        <Grid.Column textAlign="center">
          <p>
            Please stay on this page until you receive confirmation of the
            successful transaction.
            <br />
            Please note that the processing time for transactions on the
            blockchain typically ranges from 3 to 5 minutes.
          </p>

          <Header as="h3">
            <CountdownTimer initialTime={300} />
          </Header>
        </Grid.Column>

        {!getMarketplaceStatusError && (
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

export default Screen
