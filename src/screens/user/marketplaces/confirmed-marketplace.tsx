import React from 'react'
import { Grid, Header } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'
import type { ConfirmedMarketplace } from '@/types/user-marketplaces'

interface Props {
  marketplace: ConfirmedMarketplace
}

const Screen = ({ marketplace }: Props) => (
  <UserLayout>
    <Header as="h1" content={`Marketplace on ${marketplace.networkTitle}`} />

    <Grid stackable columns={1}>
      <Grid.Column>Marketplace content will be here</Grid.Column>
    </Grid>
  </UserLayout>
)

export default Screen
