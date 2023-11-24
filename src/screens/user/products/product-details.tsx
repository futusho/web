import React from 'react'
import { Grid, Header } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { UserProductDetails } from '@/types/user-products'

interface Props {
  product: UserProductDetails
}

const Screen = ({ product }: Props) => (
  <UserLayout>
    <Header as="h1" content={product.title} />

    <Grid columns={1} stackable>
      <Grid.Column>
        <p>{JSON.stringify(product)}</p>
      </Grid.Column>
    </Grid>
  </UserLayout>
)

export default Screen
