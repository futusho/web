import React from 'react'
import { Header, Grid } from 'semantic-ui-react'
import { ConnectWallet as ConnectWalletWidget } from '@/screens/shared/components'

interface Props {
  networkChainId: number
}

export const ConnectWallet = ({ networkChainId }: Props) => (
  <Grid columns={1} stackable>
    <Grid.Column>
      <Header as="h3" textAlign="center">
        Step 1 of 3: Connect your wallet
      </Header>
    </Grid.Column>

    <Grid.Column>
      <p>
        To process the transaction on the blockchain, you need to connect your
        crypto wallet. Please make sure you have one of the supported wallets
        (e.g., MetaMask, Coinbase Wallet, etc.) installed and connected to your
        browser.
      </p>

      <p>
        To connect your wallet, simply choose one of the supported wallets
        listed below.
      </p>
    </Grid.Column>

    <Grid.Column textAlign="center">
      <ConnectWalletWidget chainId={networkChainId} />
    </Grid.Column>
  </Grid>
)
