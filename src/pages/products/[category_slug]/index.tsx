import React from 'react'
import { useHasMounted } from '@/hooks'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  MarketplaceProductCategoryShowcase,
} from '@/screens/marketplace'
import type {
  ProductCategoryDetails,
  ProductItem,
} from '@/types/marketplace-product-categories'
import { getProductsByCategoryForMarketplace } from '@/useCases/getProductsByCategoryForMarketplace'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  category?: ProductCategoryDetails
  products?: ProductItem[]
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.category_slug) {
      return {
        notFound: true,
      }
    }

    const { category, products } = await getProductsByCategoryForMarketplace({
      categorySlug: context.params.category_slug.toString(),
    })

    return { props: { repo: { category, products } } }
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

  if (!repo.category) {
    return <ErrorScreen error="Error" description="Unable to load category" />
  }

  if (!Array.isArray(repo.products)) {
    return <ErrorScreen error="Error" description="Unable to load products" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <MarketplaceProductCategoryShowcase
      category={repo.category}
      products={repo.products}
    />
  )
}
