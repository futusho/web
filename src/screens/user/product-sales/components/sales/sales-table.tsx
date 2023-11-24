import React from 'react'
import { Table } from 'semantic-ui-react'
import type { UserProductSaleItem } from '@/types/user-product-sales'
import SaleRow from './sales-table-row'

interface Props {
  sales: UserProductSaleItem[]
}

const Component = ({ sales }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Title</Table.HeaderCell>
        <Table.HeaderCell>Revenue</Table.HeaderCell>
        <Table.HeaderCell>Date</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {sales.map((sale) => (
        <SaleRow key={sale.id} sale={sale} />
      ))}
    </Table.Body>
  </Table>
)

export default Component
