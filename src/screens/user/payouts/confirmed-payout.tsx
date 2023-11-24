import React from 'react'
import { Table, Header, Grid } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { ConfirmedPayout } from '@/types/user-payouts'

interface Props {
  payout: ConfirmedPayout
}

export default function Screen({ payout }: Props) {
  return (
    <UserLayout>
      <Header
        as="h1"
        content="Your payout has been processed"
        textAlign="center"
      />

      <Grid stackable columns={1}>
        <Grid.Column>
          <Table basic stackable>
            <Table.Body>
              <Table.Row>
                <Table.Cell collapsing>Confirmed:</Table.Cell>
                <Table.Cell>
                  {new Date(payout.confirmedAt).toLocaleString()}
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell collapsing>Network fee:</Table.Cell>
                <Table.Cell>
                  {Number(payout.transactionFee).toFixed(10)}
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
