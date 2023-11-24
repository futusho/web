import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { ProductDetailsScreen } from '@/screens/user'
import type { UserProductDetails } from '@/types/user-products'
import { getUserProductDetails } from '@/useCases/getUserProductDetails'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  product?: UserProductDetails
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

    const product = await getUserProductDetails({
      userId: user.userId,
      userProductId: context.params.id.toString(),
    })

    return { props: { repo: { product } } }
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

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <ProductDetailsScreen product={repo.product} />
}
