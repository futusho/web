import { useRouter } from 'next/router'
import React, { useState, useEffect } from 'react'
import { Grid, Button, Header, Message } from 'semantic-ui-react'
import {
  useWaitForTransaction,
  useBalance,
  useContractWrite,
  usePrepareContractWrite,
  useAccount,
  useDisconnect,
  useNetwork,
} from 'wagmi'
import { ErrorMessage, LoadingMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { marketplaces as MarketplacesAPI } from '@/lib/api/user/marketplaces'
import { futushoABI } from '@/lib/blockchain/generated'
import { ConnectWallet } from '@/screens/shared/components'
import type { BlockchainTransactionHash } from '@/types/blockchain'
import type { DraftMarketplace } from '@/types/user-marketplaces'

interface Props {
  marketplace: DraftMarketplace
}

const Screen = ({ marketplace }: Props) => {
  const router = useRouter()

  const [isAgreed, setIsAgreed] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<BlockchainTransactionHash | null>(null)
  const [
    registerMarketplaceTransactionError,
    setRegisterMarketplaceTransactionError,
  ] = useState<string>('')
  const [
    registerMarketplaceTransactionValidationErrors,
    setRegisterMarketplaceTransactionValidationErrors,
  ] = useState<string[]>([])

  const { address: accountAddress, isConnected } = useAccount()
  const { chain } = useNetwork()
  const { disconnect } = useDisconnect()

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useBalance({
    enabled: isConnected && chain && chain.id === marketplace.networkChainId,
    address: accountAddress,
    chainId: marketplace.networkChainId,
  })

  const {
    config: registerMarketplaceConfig,
    error: registerMarketplacePrepareError,
  } = usePrepareContractWrite({
    enabled: isAgreed,
    abi: futushoABI,
    functionName: 'registerSeller',
    address: marketplace.networkMarketplaceSmartContractAddress,
    chainId: marketplace.networkChainId,
    args: [marketplace.sellerId, marketplace.id],
    account: accountAddress,
    gas: 6000000n,
  })

  const {
    write: writeRegisterMarketplace,
    error: registerMarketplaceError,
    isLoading: registrationProcessing,
  } = useContractWrite({
    ...registerMarketplaceConfig,
    onSuccess(data) {
      setTxHash(data.hash)
    },
  })

  const { isLoading: waitingForTransaction } = useWaitForTransaction({
    enabled: isAgreed && txHash !== null,
    chainId: marketplace.networkChainId,
    hash: txHash !== null ? txHash : undefined,
    confirmations: 1,
    onSuccess(data) {
      if (data.from === accountAddress) {
        router.reload()
      }
    },
  })

  const handleRegisterMarketplace = () => {
    writeRegisterMarketplace?.()
  }

  useEffect(() => {
    if (!txHash) return

    const registerMarketplaceTransaction = async () => {
      try {
        setRegisterMarketplaceTransactionError('')
        setRegisterMarketplaceTransactionValidationErrors([])

        const response = await MarketplacesAPI.addMarketplaceTransaction(
          marketplace.id,
          {
            tx_hash: txHash,
          }
        )

        if (!response.data) {
          throw new Error('There is not data in API response')
        }

        router.reload()
      } catch (e) {
        if (e instanceof APIError) {
          setRegisterMarketplaceTransactionError(e.message)
          setRegisterMarketplaceTransactionValidationErrors(e.validationErrors)
        } else {
          setRegisterMarketplaceTransactionError(`${e}`)
        }
      }
    }

    registerMarketplaceTransaction()
  }, [txHash, marketplace.id, router])

  return (
    <UserLayout>
      <Header as="h1" content={`Marketplace on ${marketplace.networkTitle}`} />

      <Grid stackable columns={1}>
        <Grid.Column>
          {isConnected ? (
            <>
              {chain && chain.id === marketplace.networkChainId ? (
                <>
                  {balanceLoading ? (
                    <LoadingMessage content="Loading balance..." />
                  ) : (
                    <>
                      {balance ? (
                        <>
                          {+balance.formatted > 0 ? (
                            <>
                              <p>
                                Your current account: {accountAddress}. This
                                address will be like your special key to get
                                into your own smart contract on the blockchain.
                                Just make sure you have a backup of how to get
                                into your wallet. If you don&apos;t, you
                                won&apos;t be able to take out any money from
                                your smart contract.
                              </p>

                              <p>
                                If you&apos;re good with all of that, just click
                                the button below to begin the process on the{' '}
                                {chain.name}.
                              </p>

                              {registerMarketplacePrepareError && (
                                <ErrorMessage
                                  header="Unable to prepare registration"
                                  content={
                                    registerMarketplacePrepareError.message
                                  }
                                />
                              )}

                              {registerMarketplaceError && (
                                <ErrorMessage
                                  header="Unable to register marketplace"
                                  content={registerMarketplaceError.message}
                                />
                              )}

                              {registerMarketplaceTransactionError && (
                                <ErrorMessage
                                  header="Unable to add registration transaction"
                                  content={registerMarketplaceTransactionError}
                                />
                              )}

                              {registerMarketplaceTransactionValidationErrors.length >
                                0 && (
                                <Message
                                  icon="ban"
                                  error
                                  header="Unable to add registration transaction"
                                  list={
                                    registerMarketplaceTransactionValidationErrors
                                  }
                                />
                              )}

                              {isAgreed ? (
                                <Button
                                  primary
                                  content="Register marketplace"
                                  loading={
                                    registrationProcessing ||
                                    waitingForTransaction
                                  }
                                  onClick={() => handleRegisterMarketplace()}
                                />
                              ) : (
                                <Button
                                  positive
                                  content="Yes, I understand"
                                  onClick={() => setIsAgreed(true)}
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <p>
                                Unfortunately, you don&apos;t have enough tokens
                                to pay for gas fees.
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <p>Unable to load balance.</p>
                          {balanceError && <p>{balanceError.message}</p>}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <p>Your wallet is connected to a wrong network.</p>

                  <Button
                    secondary
                    content={`Reconnect to ${marketplace.networkTitle}`}
                    onClick={() => disconnect()}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <p>Please connect your wallet</p>

              <ConnectWallet chainId={marketplace.networkChainId} />
            </>
          )}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}

export default Screen
