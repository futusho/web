import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { ProductsScreen } from '@/screens/user'
import type { UserProductItem } from '@/types/user-products'
import { getUserProducts } from '@/useCases/getUserProducts'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  products?: UserProductItem[]
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

    const products = await getUserProducts({ userId: user.userId })

    return { props: { repo: { products } } }
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

  if (typeof repo.products === 'undefined') {
    return <p>Invalid products</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <ProductsScreen products={repo.products} />
}
