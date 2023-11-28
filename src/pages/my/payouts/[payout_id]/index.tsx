import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import {
  ErrorScreen,
  LoadingScreen,
  CancelledPayoutScreen,
  ConfirmedPayoutScreen,
  UnconfirmedPayoutScreen,
  UnpaidPayoutWithCoinScreen,
  UnpaidPayoutWithERC20Screen,
} from '@/screens/user'
import type {
  PendingPayoutCoin,
  PendingPayoutERC20,
  UserPayout,
  CancelledPayout,
  ConfirmedPayout,
  UnconfirmedPayout,
} from '@/types/user-payouts'
import { getUserPayoutBasedOnStatus } from '@/useCases/getUserPayoutBasedOnStatus'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  payout?: UserPayout
}

const isUnpaidPayoutERC20 = (
  payout: UserPayout
): payout is PendingPayoutERC20 =>
  (payout as PendingPayoutERC20).amountInTokens !== undefined

const isUnpaidPayoutCoin = (payout: UserPayout): payout is PendingPayoutCoin =>
  (payout as PendingPayoutCoin).amountInCoins !== undefined

const isUnconfirmedPayout = (payout: UserPayout): payout is UnconfirmedPayout =>
  (payout as UnconfirmedPayout).transactionHash !== undefined

const isConfirmedPayout = (payout: UserPayout): payout is ConfirmedPayout =>
  (payout as ConfirmedPayout).gas !== undefined

const isCancelledPayout = (payout: UserPayout): payout is CancelledPayout =>
  (payout as CancelledPayout).cancelledAt !== undefined

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.payout_id) {
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

    const payoutId = context.params.payout_id as string

    const userPayout = await getUserPayoutBasedOnStatus({
      userId: user.userId,
      userPayoutId: payoutId,
    })

    return {
      props: {
        repo: {
          payout: userPayout,
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

  if (!repo.payout) {
    return <ErrorScreen error="Error" description="Unable to load payout" />
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  if (isUnpaidPayoutCoin(repo.payout)) {
    return <UnpaidPayoutWithCoinScreen payout={repo.payout} />
  }

  if (isUnpaidPayoutERC20(repo.payout)) {
    return <UnpaidPayoutWithERC20Screen payout={repo.payout} />
  }

  if (isUnconfirmedPayout(repo.payout)) {
    return <UnconfirmedPayoutScreen payout={repo.payout} />
  }

  if (isConfirmedPayout(repo.payout)) {
    return <ConfirmedPayoutScreen payout={repo.payout} />
  }

  if (isCancelledPayout(repo.payout)) {
    return <CancelledPayoutScreen payout={repo.payout} />
  }

  return (
    <ErrorScreen
      error="Please contact our team"
      description="Unsupported payout"
    />
  )
}
