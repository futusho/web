import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { PayoutsScreen } from '@/screens/user'
import type {
  UserPayoutItem,
  TokenBalanceForWithdrawal,
} from '@/types/user-payouts'
import { getUserPayouts } from '@/useCases/getUserPayouts'
import { getUserTokenBalanceForWithdrawal } from '@/useCases/getUserTokenBalanceForWithdrawal'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  payouts?: UserPayoutItem[]
  tokenBalances?: TokenBalanceForWithdrawal[]
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

    const payouts = await getUserPayouts({
      userId: user.userId,
    })

    const tokenBalances = await getUserTokenBalanceForWithdrawal({
      userId: user.userId,
    })

    return { props: { repo: { payouts, tokenBalances } } }
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

  if (typeof repo.payouts === 'undefined') {
    return <p>Unable to get user payouts</p>
  }

  if (typeof repo.tokenBalances === 'undefined') {
    return <p>Unable to get user token balances</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <PayoutsScreen payouts={repo.payouts} tokenBalances={repo.tokenBalances} />
  )
}
