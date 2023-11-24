import React from 'react'
import { Table } from 'semantic-ui-react'
import type { UserProductOrderItem } from '@/types/user-orders'
import OrderRow from './orders-table-row'

interface Props {
  orders: UserProductOrderItem[]
  onCancelOrder(_orderId: string): void
}

const Component = ({ orders, onCancelOrder }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Product</Table.HeaderCell>
        <Table.HeaderCell>Price</Table.HeaderCell>
        <Table.HeaderCell>Status</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} onCancelOrder={onCancelOrder} />
      ))}
    </Table.Body>
  </Table>
)

export default Component
