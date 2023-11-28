import React from 'react'
import { useHasMounted } from '@/hooks'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  MarketplaceProductCategories,
} from '@/screens/marketplace'
import type { ProductCategoryItem } from '@/types/marketplace-product-categories'
import { getProductCategoriesForMarketplace } from '@/useCases/getProductCategoriesForMarketplace'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  productCategories?: ProductCategoryItem[]
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async () => {
  try {
    const productCategories = await getProductCategoriesForMarketplace()

    return { props: { repo: { productCategories } } }
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

  if (!Array.isArray(repo.productCategories)) {
    return <ErrorScreen error="Error" description="Unable to load categories" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return <MarketplaceProductCategories categories={repo.productCategories} />
}
