import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import { ErrorScreen, LoadingScreen, PayoutsScreen } from '@/screens/user'
import type {
  UserPayoutItem,
  TokenBalanceForWithdrawal,
} from '@/types/user-payouts'
import { getUserPayouts } from '@/useCases/getUserPayouts'
import { getUserTokenBalanceForWithdrawal } from '@/useCases/getUserTokenBalanceForWithdrawal'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  payouts?: UserPayoutItem[]
  tokenBalances?: TokenBalanceForWithdrawal[]
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

  if (!Array.isArray(repo.payouts)) {
    return <ErrorScreen error="Error" description="Unable to load payouts" />
  }

  if (!Array.isArray(repo.tokenBalances)) {
    return (
      <ErrorScreen error="Error" description="Unable to load token balances" />
    )
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <PayoutsScreen payouts={repo.payouts} tokenBalances={repo.tokenBalances} />
  )
}
