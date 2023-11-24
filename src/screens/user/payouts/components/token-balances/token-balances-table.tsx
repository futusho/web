import React from 'react'
import { Table } from 'semantic-ui-react'
import type { TokenBalanceForWithdrawal } from '@/types/user-payouts'
import TokenBalanceRow from './token-balances-table-row'

interface Props {
  tokenBalances: TokenBalanceForWithdrawal[]
  handleCreatePayout: (
    _userMarketplaceId: string,
    _userMarketplaceTokenId: string
  ) => void
}

const Component = ({ tokenBalances, handleCreatePayout }: Props) => (
  <Table celled size="large">
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell>Marketplace</Table.HeaderCell>
        <Table.HeaderCell>Balance</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {tokenBalances.map((tokenBalance) => (
        <TokenBalanceRow
          key={
            tokenBalance.userMarketplaceId + tokenBalance.userMarketplaceTokenId
          }
          tokenBalance={tokenBalance}
          handleCreatePayout={handleCreatePayout}
        />
      ))}
    </Table.Body>
  </Table>
)

export default Component
