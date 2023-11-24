import React from 'react'
import { List, Header, Label, Image, Card } from 'semantic-ui-react'
import type { ProductItem } from '@/types/marketplace-product-categories'

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

    <Card.Content meta>
      <List horizontal verticalAlign="middle">
        <List.Item>
          <Image
            verticalAlign="middle"
            size="tiny"
            avatar
            src={product.sellerAvatarURL}
            title={product.sellerDisplayName}
            alt={product.sellerDisplayName}
          />
        </List.Item>
        <List.Item>
          <Header as="h5" content={product.sellerDisplayName} />
        </List.Item>
      </List>
    </Card.Content>

    <Card.Content extra>
      <Label tag>{product.priceFormatted}</Label>
    </Card.Content>
  </Card>
)

export default Component
