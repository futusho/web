import React from 'react'
import { Header, Button, Table } from 'semantic-ui-react'
import type { TokenBalanceForWithdrawal } from '@/types/user-payouts'

interface Props {
  tokenBalance: TokenBalanceForWithdrawal
  handleCreatePayout: (
    _userMarketplaceId: string,
    _userMarketplaceTokenId: string
  ) => void
}

const Component = ({ tokenBalance, handleCreatePayout }: Props) => (
  <Table.Row>
    <Table.Cell>
      <Header as="h4">
        <Header.Content>
          {tokenBalance.networkTitle}
          <Header.Subheader>
            Marketplace: {tokenBalance.marketplaceSmartContractAddress}
          </Header.Subheader>

          {tokenBalance.tokenSmartContractAddress && (
            <Header.Subheader>
              Token: {tokenBalance.tokenSmartContractAddress}
            </Header.Subheader>
          )}
        </Header.Content>
      </Header>
    </Table.Cell>
    <Table.Cell collapsing>{tokenBalance.amountFormatted}</Table.Cell>
    <Table.Cell collapsing>
      <Button
        size="small"
        secondary
        content="Continue"
        onClick={() =>
          handleCreatePayout(
            tokenBalance.userMarketplaceId,
            tokenBalance.userMarketplaceTokenId
          )
        }
      />
    </Table.Cell>
  </Table.Row>
)

export default Component
