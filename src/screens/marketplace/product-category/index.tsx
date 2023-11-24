import React from 'react'
import { Grid, Header } from 'semantic-ui-react'
import { MainLayout } from '@/layouts'
import type {
  ProductCategoryDetails,
  ProductItem,
} from '@/types/marketplace-product-categories'
import { ProductCards } from '../components'

interface Props {
  category: ProductCategoryDetails
  products: ProductItem[]
}

export default function Screen({ category, products }: Props) {
  return (
    <MainLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content={category.title} />
        </Grid.Column>

        <Grid.Column textAlign="center" style={{ fontSize: '1.2em' }}>
          <p>{category.description}</p>
        </Grid.Column>

        <Grid.Column>
          {products.length > 0 ? (
            <ProductCards products={products} />
          ) : (
            <p>No products yet</p>
          )}
        </Grid.Column>
      </Grid>
    </MainLayout>
  )
}
