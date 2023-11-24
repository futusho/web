import React from 'react'
import { Button, Header, Table } from 'semantic-ui-react'
import type { UserProductSaleItem } from '@/types/user-product-sales'

interface Props {
  sale: UserProductSaleItem
}

const Component = ({ sale }: Props) => (
  <Table.Row>
    <Table.Cell>
      <Header as="h4">
        <Header.Content>
          {sale.productTitle}
          <Header.Subheader>Buyer: {sale.buyerDisplayName}</Header.Subheader>
          <Header.Subheader>{sale.networkTitle}</Header.Subheader>
        </Header.Content>
      </Header>
    </Table.Cell>
    <Table.Cell collapsing>
      <Header as="h4">
        <Header.Content>
          {sale.sellerIncomeFormatted}
          <Header.Subheader>
            Fee: {sale.platformIncomeFormatted}
          </Header.Subheader>
        </Header.Content>
      </Header>
    </Table.Cell>
    <Table.Cell collapsing>
      <time dateTime={sale.date}>
        {new Date(sale.date).toLocaleDateString()}
      </time>
    </Table.Cell>
    <Table.Cell collapsing textAlign="right">
      <Button
        size="small"
        as="a"
        icon="eye"
        href={`/my/sales/${sale.id}`}
        title="View"
        disabled
      />
    </Table.Cell>
  </Table.Row>
)

export default Component
