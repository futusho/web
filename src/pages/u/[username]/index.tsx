import React from 'react'
import { useHasMounted } from '@/hooks'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  SellerMarketplaceHomepageScreen,
} from '@/screens/seller-marketplace'
import type { SellerCard, ProductItem } from '@/types/seller-marketplace'
import { getSellerShowcase } from '@/useCases/getSellerShowcase'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  seller?: SellerCard
  products?: ProductItem[]
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.username) {
      return {
        notFound: true,
      }
    }

    const showcase = await getSellerShowcase({
      sellerUsername: context.params.username.toString(),
    })

    return {
      props: {
        repo: {
          seller: showcase.seller,
          products: showcase.products,
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

  if (!repo.seller) {
    return <ErrorScreen error="Error" description="No seller in a response" />
  }

  if (!Array.isArray(repo.products)) {
    return <ErrorScreen error="Error" description="No products in a response" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <SellerMarketplaceHomepageScreen
      seller={repo.seller}
      products={repo.products}
    />
  )
}
