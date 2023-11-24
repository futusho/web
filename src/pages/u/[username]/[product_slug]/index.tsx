import React from 'react'
import { useHasMounted } from '@/hooks'
import { SellerMarketplaceProductScreen } from '@/screens/seller-marketplace'
import type { ProductDetails, SellerDetails } from '@/types/seller-marketplace'
import { getSellerProductShowcase } from '@/useCases/getSellerProductShowcase'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  product?: ProductDetails
  seller?: SellerDetails
  errorMessage?: string
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
    return { props: { repo: { errorMessage: `${e}` } } }
  }
}

export default function Page({
  repo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const hasMounted = useHasMounted()

  if (repo.errorMessage) {
    return <p>{repo.errorMessage}</p>
  }

  if (!repo.product) {
    return <p>Unable to get product showcase</p>
  }

  if (!repo.seller) {
    return <p>Unable to get seller</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <SellerMarketplaceProductScreen
      product={repo.product}
      seller={repo.seller}
    />
  )
}
