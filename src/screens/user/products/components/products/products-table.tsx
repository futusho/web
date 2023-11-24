import React from 'react'
import { Table } from 'semantic-ui-react'
import type { UserProductItem } from '@/types/user-products'
import ProductRow from './products-table-row'

interface Props {
  products: UserProductItem[]
}

const Component = ({ products }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Title</Table.HeaderCell>
        <Table.HeaderCell>Price</Table.HeaderCell>
        <Table.HeaderCell>Status</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {products.map((product) => (
        <ProductRow key={product.id} product={product} />
      ))}
    </Table.Body>
  </Table>
)

export default Component
