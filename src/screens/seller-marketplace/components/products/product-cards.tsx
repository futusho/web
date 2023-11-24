import React from 'react'
import { Card } from 'semantic-ui-react'
import type { ProductItem } from '@/types/seller-marketplace'
import Product from './product-card'

interface Props {
  products: ProductItem[]
}

const Component = ({ products }: Props) => (
  <Card.Group itemsPerRow={3} stackable>
    {products.map((product) => (
      <Product key={product.id} product={product} />
    ))}
  </Card.Group>
)

export default Component
