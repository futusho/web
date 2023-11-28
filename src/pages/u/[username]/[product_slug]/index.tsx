import React from 'react'
import { useHasMounted } from '@/hooks'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  SellerMarketplaceProductScreen,
} from '@/screens/seller-marketplace'
import type { ProductDetails, SellerDetails } from '@/types/seller-marketplace'
import { getSellerProductShowcase } from '@/useCases/getSellerProductShowcase'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  product?: ProductDetails
  seller?: SellerDetails
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.username || !context?.params?.product_slug) {
      return {
        notFound: true,
      }
    }

    const showcase = await getSellerProductShowcase({
      sellerUsername: context.params.username.toString(),
      productSlug: context.params.product_slug.toString(),
    })

    return {
      props: {
        repo: {
          product: showcase.product,
          seller: showcase.seller,
        },
      },
    }
  } catch (e) {
    return { props: { repo: captureServerPageError(e) } }
  }
}

export default function Page({
  repo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const hasMounted = useHasMounted()

  if (repo.useCaseErrors) {
    return (
      <ErrorScreen error="Internal Server Error" errors={repo.useCaseErrors} />
    )
  }

  if (repo.errorMessage) {
    return <ErrorScreen error="Error" description={repo.errorMessage} />
  }

  if (!repo.product) {
    return <ErrorScreen error="Error" description="No product in a response" />
  }

  if (!repo.seller) {
    return <ErrorScreen error="Error" description="No seller in a response" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <SellerMarketplaceProductScreen
      product={repo.product}
      seller={repo.seller}
    />
  )
}
