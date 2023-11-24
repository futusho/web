import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { ProductSalesScreen } from '@/screens/user'
import type { UserProductSaleItem } from '@/types/user-product-sales'
import { getUserProductSales } from '@/useCases/getUserProductSales'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  sales?: UserProductSaleItem[]
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

    const sales = await getUserProductSales({ userId: user.userId })

    return { props: { repo: { sales } } }
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

  if (typeof repo.sales === 'undefined') {
    return <p>Invalid sales</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <ProductSalesScreen sales={repo.sales} />
}
