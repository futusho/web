import Head from 'next/head'
import React from 'react'
import { LandingHomepageScreen } from '@/screens/landing'
import { getIsSsrMobile } from '@/utils/get-is-ssr-mobile'
import type { GetServerSidePropsContext } from 'next'

export default function Page() {
  const description =
    "Vibrant marketplace that offers a set of tools and services for people who can't trust old platforms and centralized solutions anymore."

  return (
    <>
      <Head>
        <title>Welcome to FutúSho!</title>
        <meta name="description" content={description} />
        <meta property="og:title" content="Welcome to FutúSho!" />
        <meta property="og:description" content={description} />
      </Head>
      <LandingHomepageScreen />
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
    },
  }
}
