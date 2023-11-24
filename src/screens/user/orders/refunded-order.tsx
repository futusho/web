import React from 'react'
import { Header, Grid } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { RefundedOrder } from '@/types/user-orders'

interface Props {
  order: RefundedOrder
}

export default function Screen({ order }: Props) {
  return (
    <UserLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content={order.productTitle} />
        </Grid.Column>

        <Grid.Column textAlign="center">
          Your order was refunded {order.refundedAt}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
