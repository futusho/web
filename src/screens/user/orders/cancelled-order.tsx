import React from 'react'
import { Header, Grid } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { CancelledOrder } from '@/types/user-orders'

interface Props {
  order: CancelledOrder
}

export default function Screen({ order }: Props) {
  return (
    <UserLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content={order.productTitle} />
        </Grid.Column>

        <Grid.Column textAlign="center">
          Your order was cancelled {order.cancelledAt}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
