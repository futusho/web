import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import {
  CancelledOrderScreen,
  ConfirmedOrderScreen,
  RefundedOrderScreen,
  UnconfirmedOrderScreen,
  UnpaidOrderWithCoinScreen,
  UnpaidOrderWithERC20Screen,
} from '@/screens/user'
import type {
  PendingOrderCoin,
  PendingOrderERC20,
  RefundedOrder,
  UserProductOrder,
  CancelledOrder,
  ConfirmedOrder,
  UnconfirmedOrder,
} from '@/types/user-orders'
import { getUserProductOrderBasedOnStatus } from '@/useCases/getUserProductOrderBasedOnStatus'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  order?: UserProductOrder
  errorMessage?: string
}

const isUnpaidOrderERC20 = (
  order: UserProductOrder
): order is PendingOrderERC20 =>
  (order as PendingOrderERC20).priceInTokens !== undefined

const isUnpaidOrderCoin = (
  order: UserProductOrder
): order is PendingOrderCoin =>
  (order as PendingOrderCoin).priceInCoins !== undefined

const isUnconfirmedOrder = (
  order: UserProductOrder
): order is UnconfirmedOrder =>
  (order as UnconfirmedOrder).transactionHash !== undefined

const isConfirmedOrder = (order: UserProductOrder): order is ConfirmedOrder =>
  (order as ConfirmedOrder).gas !== undefined

const isCancelledOrder = (order: UserProductOrder): order is CancelledOrder =>
  (order as CancelledOrder).cancelledAt !== undefined

const isRefundedOrder = (order: UserProductOrder): order is RefundedOrder =>
  (order as RefundedOrder).refundedAt !== undefined

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.order_id) {
      return {
        notFound: true,
      }
    }

    const user = await getServerSession(context.req, context.res, authOptions)

    if (!user?.userId) {
      return {
        redirect: {
          statusCode: 303,
          destination: '/api/auth/signin',
        },
      }
    }

    const orderId = context.params.order_id as string

    const userProductOrder = await getUserProductOrderBasedOnStatus({
      userId: user.userId,
      userProductOrderId: orderId,
    })

    return {
      props: {
        repo: {
          order: userProductOrder,
        },
      },
    }
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

  if (!repo.order) {
    return <p>No order in response</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  if (isUnpaidOrderCoin(repo.order)) {
    return <UnpaidOrderWithCoinScreen order={repo.order} />
  }

  if (isUnpaidOrderERC20(repo.order)) {
    return <UnpaidOrderWithERC20Screen order={repo.order} />
  }

  if (isUnconfirmedOrder(repo.order)) {
    return <UnconfirmedOrderScreen order={repo.order} />
  }

  if (isConfirmedOrder(repo.order)) {
    return <ConfirmedOrderScreen order={repo.order} />
  }

  if (isCancelledOrder(repo.order)) {
    return <CancelledOrderScreen order={repo.order} />
  }

  if (isRefundedOrder(repo.order)) {
    return <RefundedOrderScreen order={repo.order} />
  }

  return <p>Unknown order</p>
}
