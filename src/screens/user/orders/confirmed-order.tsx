import React from 'react'
import { Table, Divider, Icon, Header, Grid, Image } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import { reduceWalletAddress } from '@/lib/blockchain/helpers'
import type { ConfirmedOrder } from '@/types/user-orders'

interface Props {
  order: ConfirmedOrder
}

export default function Screen({ order }: Props) {
  return (
    <UserLayout>
      <Header
        as="h1"
        content={`Thank you for purchasing ${order.productTitle}!`}
        textAlign="center"
      />

      <Grid stackable columns={1} padded="vertically">
        <Grid.Column width={9}>
          <Header as="h3" content="Here is content provided by the seller:" />

          <div>{order.productContent}</div>
        </Grid.Column>

        <Grid.Column width={1}>
          <Divider vertical>
            <Icon name="heart" color="red" />
          </Divider>
        </Grid.Column>

        <Grid.Column width={6}>
          {order.productThumbnailImageURL && (
            <Image
              rounded
              src={order.productThumbnailImageURL}
              alt={order.productTitle}
            />
          )}

          <Table basic stackable>
            <Table.Body>
              <Table.Row>
                <Table.Cell width={6}>Confirmed:</Table.Cell>
                <Table.Cell>
                  {new Date(order.confirmedAt).toLocaleString()}
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell width={6}>Your wallet:</Table.Cell>
                <Table.Cell>
                  <a
                    href={`${order.networkBlockchainExplorerURL}/address/${order.buyerWalletAddress}`}
                    target="_blank"
                    rel="nofollow noreferrer noopener"
                  >
                    {reduceWalletAddress(order.buyerWalletAddress)}
                  </a>
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell width={6}>Seller wallet:</Table.Cell>
                <Table.Cell>
                  <a
                    href={`${order.networkBlockchainExplorerURL}/address/${order.sellerWalletAddress}`}
                    target="_blank"
                    rel="nofollow noreferrer noopener"
                  >
                    {reduceWalletAddress(order.sellerWalletAddress)}
                  </a>
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell width={6}>Network fee:</Table.Cell>
                <Table.Cell>
                  {Number(order.transactionFee).toFixed(10)}
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
