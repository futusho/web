import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { EditProductScreen } from '@/screens/user'
import type {
  EditableProductDetails,
  ProductCategory,
  UserMarketplaceToken,
} from '@/types/user-products'
import { getProductCategories } from '@/useCases/getProductCategories'
import { getUserMarketplaceTokens } from '@/useCases/getUserMarketplaceTokens'
import { getUserProductDetailsForEdit } from '@/useCases/getUserProductDetailsForEdit'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  product?: EditableProductDetails
  tokens?: UserMarketplaceToken[]
  productCategories?: ProductCategory[]
  errorMessage?: string
}

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    const user = await getServerSession(context.req, context.res, authOptions)

    if (!user?.userId) {
      return {
        redirect: {
          statusCode: 303,
          destination: '/api/auth/signin',
        },
      }
    }

    if (!context?.params?.id) {
      return {
        notFound: true,
      }
    }

    const product = await getUserProductDetailsForEdit({
      userId: user.userId,
      userProductId: context.params.id.toString(),
    })

    const tokens = await getUserMarketplaceTokens({
      userId: user.userId,
    })
    const productCategories = await getProductCategories()

    const options = {
      product: product,
      tokens: tokens,
      productCategories: productCategories,
    }

    return { props: { repo: { ...options } } }
  } catch (e) {
    return { props: { repo: { errorMessage: `${e}` } } }
  }
}

export default function Page({
  repo,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  useSession({ required: true })

  const hasMounted = useHasMounted()

  if (repo.errorMessage) {
    return <p>{repo.errorMessage}</p>
  }

  if (!repo.product) {
    return <p>Unable to load product</p>
  }

  if (!repo.tokens) {
    return <p>No tokens yet</p>
  }

  if (!repo.productCategories) {
    return <p>No categories yet</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <EditProductScreen
      product={repo.product}
      tokens={repo.tokens}
      productCategories={repo.productCategories}
    />
  )
}
