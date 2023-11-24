import { configureChains, createConfig } from 'wagmi'
import {
  mainnet,
  bsc,
  bscTestnet,
  polygon,
  polygonMumbai,
  sepolia,
} from 'wagmi/chains'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
// // import { alchemyProvider } from 'wagmi/providers/alchemy'
import { infuraProvider } from 'wagmi/providers/infura'
import { publicProvider } from 'wagmi/providers/public'

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, bsc, polygon, sepolia, bscTestnet, polygonMumbai],
  [
    // FIXME: This provider generates 401 error:
    // uncaughtException: Error: Unexpected server response: 401
    infuraProvider({ apiKey: process.env.INFURA_API_KEY }),
    // alchemyProvider({ apiKey: process.env.ALCHEMY_ETHEREUM_SEPOLIA_API_KEY }),
    // alchemyProvider({ apiKey: process.env.ALCHEMY_POLYGON_MUMBAI_API_KEY }),
    publicProvider(),
  ]
)

export const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'wagmi',
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
})
