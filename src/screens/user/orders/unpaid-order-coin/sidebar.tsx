import Link from 'next/link'
import React from 'react'
import { Button, Header, Grid, Table } from 'semantic-ui-react'
import { useBalance, useAccount, useDisconnect } from 'wagmi'
import { formatBalance, reduceWalletAddress } from '@/lib/blockchain/helpers'
import { buildSellerShowcaseURL } from '@/lib/routes'
import type { DraftOrderCoin, PendingOrderCoin } from '@/types/user-orders'

interface Props {
  order: DraftOrderCoin | PendingOrderCoin
}

export const Sidebar = ({ order }: Props) => {
  const { address: accountAddress, isConnected } = useAccount()

  const { data: balance } = useBalance({
    enabled: isConnected,
    address: accountAddress,
    chainId: order.networkChainId,
  })

  const disconnect = useDisconnect()

  return (
    <Grid columns={1} stackable>
      <Grid.Column>
        <Header as="h3" textAlign="center" content="Payment Information" />

        <Table basic stackable>
          <Table.Body>
            <Table.Row>
              <Table.Cell width={6}>Price</Table.Cell>
              <Table.Cell>{order.priceFormatted}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell width={6}>Network</Table.Cell>
              <Table.Cell>{order.networkTitle}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell width={6}>Smart Contract</Table.Cell>
              <Table.Cell>
                <a
                  href={`${order.networkBlockchainExplorerURL}/address/${order.sellerMarketplaceSmartContractAddress}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                >
                  {reduceWalletAddress(
                    order.sellerMarketplaceSmartContractAddress
                  )}
                </a>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell width={6}>Seller</Table.Cell>
              <Table.Cell>
                <Link
                  href={buildSellerShowcaseURL(order.sellerUsername)}
                  target="_blank"
                >
                  {order.sellerDisplayName}
                </Link>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Grid.Column>

      <Grid.Column>
        <Header as="h3" textAlign="center" content="Your Wallet Information" />

        <Table basic stackable>
          <Table.Body>
            <Table.Row>
              <Table.Cell width={6}>Account</Table.Cell>
              <Table.Cell>
                {isConnected && accountAddress ? (
                  <>{reduceWalletAddress(accountAddress)}</>
                ) : (
                  <>N/A</>
                )}
              </Table.Cell>
            </Table.Row>

            <Table.Row>
              <Table.Cell width={6}>Balance</Table.Cell>
              <Table.Cell>
                {isConnected && balance ? (
                  <>{formatBalance(balance.formatted, balance.symbol)}</>
                ) : (
                  <p>N/A</p>
                )}
              </Table.Cell>
            </Table.Row>

            {isConnected && (
              <Table.Row>
                <Table.Cell colSpan={2} textAlign="center">
                  <Button
                    secondary
                    onClick={() => disconnect.disconnect()}
                    content="Disconnect"
                  />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Grid.Column>
    </Grid>
  )
}
