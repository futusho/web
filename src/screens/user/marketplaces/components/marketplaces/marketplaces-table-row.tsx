import React from 'react'
import { Header, Table, Button } from 'semantic-ui-react'
import type { UserMarketplaceItem } from '@/types/user-marketplaces'

interface Props {
  marketplace: UserMarketplaceItem
}

const Component = ({ marketplace }: Props) => (
  <Table.Row>
    <Table.Cell>
      <Header as="h4">
        <Header.Content>
          Blockchain: {marketplace.networkTitle}
          <Header.Subheader>
            Contract: {marketplace.smartContractAddress || 'Not deployed yet'}
          </Header.Subheader>
          <Header.Subheader>
            Supported tokens: {marketplace.tokens.join(', ')}
          </Header.Subheader>
          <Header.Subheader>
            Platform fee: {marketplace.commissionRate}%
          </Header.Subheader>
        </Header.Content>
      </Header>
    </Table.Cell>
    <Table.Cell collapsing>{marketplace.status}</Table.Cell>
    <Table.Cell collapsing textAlign="right">
      {marketplace.status === 'draft' && (
        <Button
          as="a"
          href={`/my/marketplaces/${marketplace.id}`}
          icon="cloud upload"
          size="small"
          primary
        />
      )}

      {marketplace.status === 'awaiting_confirmation' && (
        <Button
          as="a"
          href={`/my/marketplaces/${marketplace.id}`}
          icon="spinner"
          loading
          size="small"
          color="orange"
        />
      )}

      {marketplace.status === 'confirmed' && (
        <Button
          as="a"
          href={`/my/marketplaces/${marketplace.id}`}
          icon="eye"
          size="small"
        />
      )}
    </Table.Cell>
  </Table.Row>
)

export default Component
