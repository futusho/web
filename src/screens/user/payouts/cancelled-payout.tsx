import React from 'react'
import { Header, Grid } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { CancelledPayout } from '@/types/user-payouts'

interface Props {
  payout: CancelledPayout
}

export default function Screen({ payout }: Props) {
  return (
    <UserLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content="Your payout was cancelled" />
        </Grid.Column>

        <Grid.Column textAlign="center">
          Cancellation date: {payout.cancelledAt}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
