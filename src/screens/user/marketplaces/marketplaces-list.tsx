import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Grid, Modal, Button, Table, Header, Message } from 'semantic-ui-react'
import { useNetwork, useAccount, useDisconnect } from 'wagmi'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { marketplaces as MarketplacesAPI } from '@/lib/api/user/marketplaces'
import { ConnectWallet } from '@/screens/shared/components'
import type {
  AvailableBlockchainMarketplace,
  UserMarketplaceItem,
} from '@/types/user-marketplaces'
import { MarketplacesTable } from './components'

interface Props {
  blockchainMarketplaces: AvailableBlockchainMarketplace[]
  userMarketplaces: UserMarketplaceItem[]
}

const Screen = ({ blockchainMarketplaces, userMarketplaces }: Props) => {
  const router = useRouter()

  const [newMarketplaceMarketplaceId, setNewMarketplaceMarketplaceId] =
    useState<string>('')
  const [newMarketplaceChainId, setNewMarketplaceChainId] = useState<number>(0)
  const [newMarketplaceNetworkTitle, setNewMarketplaceNetworkTitle] =
    useState<string>('')

  const [newMarketplaceOpen, setNewMarketplaceOpen] = useState<boolean>(false)

  const { address: accountAddress, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { disconnect } = useDisconnect()

  const [createMarketplaceError, setCreateMarketplaceError] =
    useState<string>('')
  const [
    createMarketplaceValidationErrors,
    setCreateMarketplaceValidationErrors,
  ] = useState<string[]>([])

  const handleCreateMarketplace = async (marketplaceId: string) => {
    if (!accountAddress) return

    try {
      setCreateMarketplaceError('')
      setCreateMarketplaceValidationErrors([])

      const response = await MarketplacesAPI.createMarketplace({
        marketplace_id: marketplaceId,
      })

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.push(`/my/marketplaces/${response.data.id}`)
    } catch (e) {
      if (e instanceof APIError) {
        setCreateMarketplaceError(e.message)
        setCreateMarketplaceValidationErrors(e.validationErrors)
      } else {
        setCreateMarketplaceError(`${e}`)
      }
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content="Marketplaces" />

      <Grid columns={1} stackable>
        <Grid.Column>
          <Button
            as="a"
            primary
            content="Add New"
            onClick={() => setNewMarketplaceOpen(true)}
          />
        </Grid.Column>

        <Grid.Column>
          {userMarketplaces.length > 0 ? (
            <MarketplacesTable marketplaces={userMarketplaces} />
          ) : (
            <p>No marketplaces yet</p>
          )}
        </Grid.Column>
      </Grid>

      <Modal
        closeIcon
        open={newMarketplaceOpen}
        onClose={() => {
          setNewMarketplaceChainId(0)
          setNewMarketplaceMarketplaceId('')
          setNewMarketplaceNetworkTitle('')
          setNewMarketplaceOpen(false)
        }}
        onOpen={() => setNewMarketplaceOpen(true)}
      >
        <Header content="Become a Seller" />
        <Modal.Content>
          {newMarketplaceChainId === 0 ? (
            <>
              <p>
                Here is a list of available marketplaces on different blockchain
                networks.
                <br />
                Please pick one where you want to create your own marketplace
                and activate payments in supported tokens.
              </p>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Network</Table.HeaderCell>
                    <Table.HeaderCell collapsing singleLine>
                      Platform Fee
                    </Table.HeaderCell>
                    <Table.HeaderCell collapsing singleLine>
                      Supported Tokens
                    </Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {blockchainMarketplaces.map((marketplace) => (
                    <Table.Row key={marketplace.id}>
                      <Table.Cell>
                        <Header as="h4">
                          <Header.Content>
                            {marketplace.networkTitle}
                            <Header.Subheader>
                              {marketplace.smartContractAddress}
                            </Header.Subheader>
                          </Header.Content>
                        </Header>
                      </Table.Cell>
                      <Table.Cell collapsing singleLine>
                        {marketplace.commissionRate}%
                      </Table.Cell>
                      <Table.Cell collapsing singleLine>
                        {marketplace.tokens.join(', ')}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Button
                          positive
                          content="Continue"
                          onClick={() => {
                            setNewMarketplaceChainId(marketplace.networkChainId)
                            setNewMarketplaceMarketplaceId(marketplace.id)
                            setNewMarketplaceNetworkTitle(
                              marketplace.networkTitle
                            )
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </>
          ) : (
            <>
              {isConnected ? (
                <>
                  {chain && chain.id === newMarketplaceChainId ? (
                    <>
                      <p>
                        In the next step, we are going to create a draft
                        marketplace for you.
                        <br />
                        After that, you will be asked to perform transaction on
                        blockchain to register as a seller in your own
                        marketplace.
                      </p>

                      {createMarketplaceError && (
                        <ErrorMessage
                          header="Unable to create marketplace"
                          content={createMarketplaceError}
                        />
                      )}

                      {createMarketplaceValidationErrors.length > 0 && (
                        <Grid.Column>
                          <Message
                            icon="ban"
                            error
                            header="Unable to create marketplace"
                            list={createMarketplaceValidationErrors}
                          />
                        </Grid.Column>
                      )}

                      <Button
                        primary
                        content="Continue"
                        onClick={() =>
                          handleCreateMarketplace(newMarketplaceMarketplaceId)
                        }
                      />
                    </>
                  ) : (
                    <>
                      <p>Your wallet is connected to a wrong network.</p>

                      <Button
                        secondary
                        content={`Reconnect to ${newMarketplaceNetworkTitle}`}
                        onClick={() => disconnect()}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>
                    To connect your wallet to {newMarketplaceNetworkTitle}{' '}
                    please use one of the supported wallets.
                  </p>

                  <ConnectWallet chainId={newMarketplaceChainId} />
                </>
              )}
            </>
          )}
        </Modal.Content>
      </Modal>
    </UserLayout>
  )
}

export default Screen
