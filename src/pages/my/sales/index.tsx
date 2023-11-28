import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import { ErrorScreen, LoadingScreen, ProductSalesScreen } from '@/screens/user'
import type { UserProductSaleItem } from '@/types/user-product-sales'
import { getUserProductSales } from '@/useCases/getUserProductSales'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  sales?: UserProductSaleItem[]
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

  if (!Array.isArray(repo.sales)) {
    return <ErrorScreen error="Error" description="Unable to load sales" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return <ProductSalesScreen sales={repo.sales} />
}
