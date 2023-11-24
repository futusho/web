import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Grid, Header, Message } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { payouts as PayoutsAPI } from '@/lib/api/user/payouts'
import type {
  TokenBalanceForWithdrawal,
  UserPayoutItem,
} from '@/types/user-payouts'
import { PayoutsTable, TokenBalancesTable } from './components'

interface Props {
  payouts: UserPayoutItem[]
  tokenBalances: TokenBalanceForWithdrawal[]
}

const Screen = ({ payouts, tokenBalances }: Props) => {
  const router = useRouter()

  const [createPayoutError, setCreatePayoutError] = useState<string>('')
  const [createPayoutValidationErrors, setCreatePayoutValidationErrors] =
    useState<string[]>([])

  const handleCreatePayout = async (
    userMarketplaceId: string,
    userMarketplaceTokenId: string
  ) => {
    try {
      setCreatePayoutError('')
      setCreatePayoutValidationErrors([])

      const response = await PayoutsAPI.createPayout({
        user_marketplace_id: userMarketplaceId,
        user_marketplace_token_id: userMarketplaceTokenId,
      })

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.push(`/my/payouts/${response.data.id}`)
    } catch (e) {
      if (e instanceof APIError) {
        setCreatePayoutError(e.message)
        setCreatePayoutValidationErrors(e.validationErrors)
      } else {
        setCreatePayoutError(`${e}`)
      }
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content="Payouts" />

      <Grid columns={1} stackable>
        <Grid.Column>
          <Header as="h3" content="Request Payout" />

          {createPayoutError && (
            <ErrorMessage
              header="Unable to create payout"
              content={createPayoutError}
            />
          )}

          {createPayoutValidationErrors.length > 0 && (
            <Grid.Column>
              <Message
                icon="ban"
                error
                header="Unable to create payout"
                list={createPayoutValidationErrors}
              />
            </Grid.Column>
          )}

          {tokenBalances.length ? (
            <TokenBalancesTable
              tokenBalances={tokenBalances}
              handleCreatePayout={handleCreatePayout}
            />
          ) : (
            <p>No available tokens for withdrawal yet</p>
          )}
        </Grid.Column>

        <Grid.Column>
          <Header as="h3" content="Payouts History" />

          {payouts.length ? (
            <PayoutsTable payouts={payouts} />
          ) : (
            <p>No payouts yet</p>
          )}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}

export default Screen
