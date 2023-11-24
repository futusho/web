import React from 'react'
import { Button, Message } from 'semantic-ui-react'
import { useConnect } from 'wagmi'

const walletColors: { [key: string]: string } = {
  metaMask: '#E2761B',
  coinbaseWallet: '#007AC3',
  walletConnect: '#315CF5',
  injected: '#4E86FF',
}

interface Props {
  chainId: number
}

export const Component = ({ chainId }: Props) => {
  const {
    connect,
    connectors,
    error: connectError,
    isLoading: isConnectLoading,
    pendingConnector,
  } = useConnect({
    chainId: chainId,
    onError(error) {
      alert('Wallet connection error: ' + error.message)
      console.error('Error', error)
    },
  })

  return (
    <>
      {connectError && (
        <Message error>
          <Message.Header content="Unable to connect wallet" />
          <p>{connectError.message}</p>
        </Message>
      )}

      {connectors.map((connector) => (
        <Button
          key={connector.id}
          style={{
            backgroundColor: walletColors[connector.id],
            color: 'white',
          }}
          disabled={!connector.ready}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {isConnectLoading &&
            pendingConnector?.id === connector.id &&
            ' (connecting)'}
        </Button>
      ))}
    </>
  )
}

export default Component
