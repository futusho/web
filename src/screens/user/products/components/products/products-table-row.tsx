import React from 'react'
import { Header, Table, Button } from 'semantic-ui-react'
import type { UserProductItem } from '@/types/user-products'

interface Props {
  product: UserProductItem
}

const Component = ({ product }: Props) => (
  <Table.Row>
    <Table.Cell>
      <Header as="h4">
        <Header.Content>
          {product.title}
          <Header.Subheader>{product.categoryTitle}</Header.Subheader>
        </Header.Content>
      </Header>
    </Table.Cell>
    <Table.Cell collapsing>{product.priceFormatted}</Table.Cell>
    <Table.Cell collapsing>{product.status}</Table.Cell>
    <Table.Cell collapsing textAlign="right">
      <Button
        as="a"
        icon="chart line"
        href={`/my/products/${product.id}`}
        title="Stats"
      />
      <Button
        as="a"
        icon="pencil"
        href={`/my/products/${product.id}/edit`}
        title="Edit"
      />
    </Table.Cell>
  </Table.Row>
)

export default Component
