import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { OrdersScreen } from '@/screens/user'
import type { UserProductOrderItem } from '@/types/user-orders'
import { getUserProductOrders } from '@/useCases/getUserProductOrders'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  orders?: UserProductOrderItem[]
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

    const orders = await getUserProductOrders({
      userId: user.userId,
    })

    return { props: { repo: { orders } } }
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

  if (typeof repo.orders === 'undefined') {
    return <p>Unable to get user product orders</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <OrdersScreen orders={repo.orders} />
}
