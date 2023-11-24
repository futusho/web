import getConfig from 'next/config'
import { Html, Head, Main, NextScript } from 'next/document'
import React from 'react'
import { Segment } from 'semantic-ui-react'

const { publicRuntimeConfig } = getConfig()

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="robots" content="noindex,nofollow" />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#2b5797" />
        <meta name="theme-color" content="#ffffff" />

        <meta
          property="og:image"
          content={`${publicRuntimeConfig.domain}/futusho-open-graph-image.png`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="675" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Welcome to FutúSho – A Vibrant Web3 Marketplace!"
        />
        <meta property="og:url" content={publicRuntimeConfig.domain} />
        <meta property="og:site_name" content="FutúSho" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Welcome to FutúSho – A Vibrant Web3 Marketplace!"
        />
        <meta
          name="twitter:image"
          content={`${publicRuntimeConfig.domain}/futusho-open-graph-image.png`}
        />
      </Head>

      <body>
        <Segment basic>
          <Main />
          <NextScript />
        </Segment>
      </body>
    </Html>
  )
}
