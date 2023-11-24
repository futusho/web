import Link from 'next/link'
import React from 'react'
import { Label, Table, Button } from 'semantic-ui-react'
import type { UserProductOrderItem } from '@/types/user-orders'

interface Props {
  order: UserProductOrderItem
  onCancelOrder(_orderId: string): void
}

interface IconByStatus {
  [status: string]: JSX.Element
}

const iconByStatus: IconByStatus = {
  cancelled: <Label color="red" icon="cancel" content="Cancelled" />,
  confirmed: <Label color="green" icon="check" content="Confirmed" />,
  draft: <Label color="yellow" icon="dollar" content="Unpaid" />,
  pending: <Label color="yellow" icon="dollar" content="Unpaid" />,
  awaiting_confirmation: <Label color="blue" icon="clock" content="Pending" />,
  refunded: <Label color="purple" icon="undo" content="Refunded" />,
}

const Component = ({ order, onCancelOrder }: Props) => (
  <Table.Row>
    <Table.Cell>
      <Link href={`/my/orders/${order.id}`}>{order.productTitle}</Link>
    </Table.Cell>
    <Table.Cell collapsing>{order.priceFormatted}</Table.Cell>
    <Table.Cell collapsing>{iconByStatus[order.status]}</Table.Cell>
    <Table.Cell collapsing textAlign="right">
      {order.cancellable && (
        <Button
          size="tiny"
          secondary
          icon="trash"
          title="Cancel order"
          onClick={() => onCancelOrder(order.id)}
        />
      )}
    </Table.Cell>
  </Table.Row>
)

export default Component
