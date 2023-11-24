import React from 'react'
import { Table } from 'semantic-ui-react'
import type { UserPayoutItem } from '@/types/user-payouts'
import PayoutRow from './payouts-table-row'

interface Props {
  payouts: UserPayoutItem[]
}

const Component = ({ payouts }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Marketplace</Table.HeaderCell>
        <Table.HeaderCell>Amount</Table.HeaderCell>
        <Table.HeaderCell>Date</Table.HeaderCell>
        <Table.HeaderCell>Status</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {payouts.map((payout) => (
        <PayoutRow key={payout.id} payout={payout} />
      ))}
    </Table.Body>
  </Table>
)

export default Component
