import React from 'react'
import { Grid, Header } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { UserProductSaleItem } from '@/types/user-product-sales'
import { SalesTable } from './components'

interface Props {
  sales: UserProductSaleItem[]
}

const Screen = ({ sales }: Props) => (
  <UserLayout>
    <Header as="h1" content="Sales" />

    <Grid columns={1} stackable>
      <Grid.Column>
        {sales.length ? <SalesTable sales={sales} /> : <p>No sales yet</p>}
      </Grid.Column>
    </Grid>
  </UserLayout>
)

export default Screen
