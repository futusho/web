import React from 'react'
import { Image, Card } from 'semantic-ui-react'
import type { ProductItem } from '@/types/seller-marketplace'

interface Props {
  product: ProductItem
}

const Component = ({ product }: Props) => (
  <Card href={product.productPageURL}>
    {product.thumbnailImageURL && (
      <Image
        src={product.thumbnailImageURL}
        alt={product.title}
        wrapped
        ui={false}
      />
    )}
    <Card.Content>
      <Card.Header>{product.title}</Card.Header>
    </Card.Content>
    <Card.Content extra>
      <p>{product.priceFormatted}</p>
    </Card.Content>
  </Card>
)

export default Component
