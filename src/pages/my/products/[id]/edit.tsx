import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import { ErrorScreen, LoadingScreen, EditProductScreen } from '@/screens/user'
import type {
  EditableProductDetails,
  ProductCategory,
  UserMarketplaceToken,
} from '@/types/user-products'
import { getProductCategories } from '@/useCases/getProductCategories'
import { getUserMarketplaceTokens } from '@/useCases/getUserMarketplaceTokens'
import { getUserProductDetailsForEdit } from '@/useCases/getUserProductDetailsForEdit'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  product?: EditableProductDetails
  tokens?: UserMarketplaceToken[]
  productCategories?: ProductCategory[]
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

    return {
      props: {
        repo: {
          product,
          tokens,
          productCategories,
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
  useSession({ required: true })

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
    return <ErrorScreen error="Error" description="Unable to load product" />
  }

  if (!Array.isArray(repo.tokens)) {
    return <ErrorScreen error="Error" description="Unable to load tokens" />
  }

  if (!Array.isArray(repo.productCategories)) {
    return (
      <ErrorScreen
        error="Error"
        description="Unable to load product categories"
      />
    )
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <EditProductScreen
      product={repo.product}
      tokens={repo.tokens}
      productCategories={repo.productCategories}
    />
  )
}
