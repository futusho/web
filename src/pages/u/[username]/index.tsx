import React from 'react'
import { useHasMounted } from '@/hooks'
import { SellerMarketplaceHomepageScreen } from '@/screens/seller-marketplace'
import type { SellerCard, ProductItem } from '@/types/seller-marketplace'
import { getSellerShowcase } from '@/useCases/getSellerShowcase'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  seller?: SellerCard
  products?: ProductItem[]
  errorMessage?: string
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

  if (!repo.seller) {
    return <p>Unable to get seller card</p>
  }

  if (typeof repo.products === 'undefined') {
    return <p>Unable to get products</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <SellerMarketplaceHomepageScreen
      seller={repo.seller}
      products={repo.products}
    />
  )
}
