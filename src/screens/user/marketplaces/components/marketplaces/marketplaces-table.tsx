import React from 'react'
import { Table } from 'semantic-ui-react'
import type { UserMarketplaceItem } from '@/types/user-marketplaces'
import MarketplaceRow from './marketplaces-table-row'

interface Props {
  marketplaces: UserMarketplaceItem[]
}

const Component = ({ marketplaces }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Marketplace</Table.HeaderCell>
        <Table.HeaderCell>Status</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {marketplaces.map((marketplace) => (
        <MarketplaceRow key={marketplace.id} marketplace={marketplace} />
      ))}
    </Table.Body>
  </Table>
)

export default Component
