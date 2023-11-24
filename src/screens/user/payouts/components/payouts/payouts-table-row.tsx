import React from 'react'
import { Button, Table } from 'semantic-ui-react'
import type { UserPayoutItem } from '@/types/user-payouts'

interface Props {
  payout: UserPayoutItem
}

const Component = ({ payout }: Props) => (
  <Table.Row>
    <Table.Cell>{payout.networkTitle}</Table.Cell>
    <Table.Cell collapsing>{payout.amountFormatted}</Table.Cell>
    <Table.Cell collapsing>{new Date(payout.date).toLocaleString()}</Table.Cell>
    <Table.Cell collapsing>{payout.status}</Table.Cell>
    <Table.Cell collapsing>
      <Button
        size="small"
        as="a"
        href={`/my/payouts/${payout.id}`}
        icon="eye"
      />
    </Table.Cell>
  </Table.Row>
)

export default Component
