import React from 'react'
import { useHasMounted } from '@/hooks'
import { MarketplaceProductCategories } from '@/screens/marketplace'
import type { ProductCategoryItem } from '@/types/marketplace-product-categories'
import { getProductCategoriesForMarketplace } from '@/useCases/getProductCategoriesForMarketplace'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  productCategories?: ProductCategoryItem[]
  errorMessage?: string
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async () => {
  try {
    const productCategories = await getProductCategoriesForMarketplace()

    return { props: { repo: { productCategories } } }
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

  if (typeof repo.productCategories === 'undefined') {
    return <p>Unable to get product categories</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <MarketplaceProductCategories categories={repo.productCategories} />
}
