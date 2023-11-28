import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import { ErrorScreen, LoadingScreen, NewProductScreen } from '@/screens/user'
import type {
  ProductCategory,
  UserMarketplaceToken,
} from '@/types/user-products'
import { getProductCategories } from '@/useCases/getProductCategories'
import { getUserMarketplaceTokens } from '@/useCases/getUserMarketplaceTokens'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
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

    const tokens = await getUserMarketplaceTokens({
      userId: user.userId,
    })
    const productCategories = await getProductCategories()

    return {
      props: {
        repo: {
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
    <NewProductScreen
      tokens={repo.tokens}
      productCategories={repo.productCategories}
    />
  )
}
