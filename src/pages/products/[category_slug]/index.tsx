import React from 'react'
import { useHasMounted } from '@/hooks'
import { MarketplaceProductCategoryShowcase } from '@/screens/marketplace'
import type {
  ProductCategoryDetails,
  ProductItem,
} from '@/types/marketplace-product-categories'
import { getProductsByCategoryForMarketplace } from '@/useCases/getProductsByCategoryForMarketplace'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  category?: ProductCategoryDetails
  products?: ProductItem[]
  errorMessage?: string
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

  if (!repo.category) {
    return <p>Unable to get category details</p>
  }

  if (typeof repo.products === 'undefined') {
    return <p>Unable to get category products</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <MarketplaceProductCategoryShowcase
      category={repo.category}
      products={repo.products}
    />
  )
}
