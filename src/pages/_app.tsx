import { useRouter } from 'next/router'
import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { WagmiConfig } from 'wagmi'
import { config } from '@/lib/blockchain/wagmi'
import type { AppProps } from 'next/app'
import type { Session } from 'next-auth'

import 'semantic-ui-css/semantic.min.css'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{
  session: Session
}>) {
  const router = useRouter()

  return (
    <WagmiConfig config={config}>
      <SessionProvider session={session}>
        <Component key={router.asPath} {...pageProps} />
      </SessionProvider>
    </WagmiConfig>
  )
}
