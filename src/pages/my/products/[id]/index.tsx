import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  ProductDetailsScreen,
} from '@/screens/user'
import type { UserProductDetails } from '@/types/user-products'
import { getUserProductDetails } from '@/useCases/getUserProductDetails'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  product?: UserProductDetails
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

    const product = await getUserProductDetails({
      userId: user.userId,
      userProductId: context.params.id.toString(),
    })

    return { props: { repo: { product } } }
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

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return <ProductDetailsScreen product={repo.product} />
}
