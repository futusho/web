import React from 'react'
import { Grid, Button, Header } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { UserProductItem } from '@/types/user-products'
import { ProductsTable } from './components'

interface Props {
  products: UserProductItem[]
}

const Screen = ({ products }: Props) => (
  <UserLayout>
    <Header as="h1" content="Products" />

    <Grid columns={1} stackable>
      <Grid.Column>
        <Button primary content="New Product" as="a" href="/my/products/new" />
      </Grid.Column>

      <Grid.Column>
        {products.length ? (
          <ProductsTable products={products} />
        ) : (
          <p>No products yet</p>
        )}
      </Grid.Column>
    </Grid>
  </UserLayout>
)

export default Screen
