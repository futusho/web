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
  ConfirmedMarketplaceScreen,
  DraftMarketplaceScreen,
  UnconfirmedMarketplaceScreen,
} from '@/screens/user'
import type {
  ConfirmedMarketplace,
  DraftMarketplace,
  UnconfirmedMarketplace,
  UserMarketplace,
} from '@/types/user-marketplaces'
import { getUserMarketplaceBasedOnStatus } from '@/useCases/getUserMarketplaceBasedOnStatus'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  marketplace?: UserMarketplace
}

const isDraftMarketplace = (
  userMarketplace: UserMarketplace
): userMarketplace is DraftMarketplace =>
  (userMarketplace as DraftMarketplace)
    .networkMarketplaceSmartContractAddress !== undefined

const isUnconfirmedMarketplace = (
  userMarketplace: UserMarketplace
): userMarketplace is UnconfirmedMarketplace =>
  (userMarketplace as UnconfirmedMarketplace).transactionHash !== undefined

const isConfirmedMarketplace = (
  userMarketplace: UserMarketplace
): userMarketplace is ConfirmedMarketplace =>
  (userMarketplace as ConfirmedMarketplace).marketplaceSmartContractAddress !==
  undefined

export const getServerSideProps: GetServerSideProps<{
  repo: Repo
}> = async (context) => {
  try {
    if (!context?.params?.id) {
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

    const sellerMarketplaceId = context.params.id as string

    const marketplace = await getUserMarketplaceBasedOnStatus({
      userId: user.userId,
      userMarketplaceId: sellerMarketplaceId,
    })

    return {
      props: {
        repo: {
          marketplace: marketplace,
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

  if (!repo.marketplace) {
    return (
      <ErrorScreen error="Error" description="Unable to load marketplace" />
    )
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  if (isConfirmedMarketplace(repo.marketplace)) {
    return <ConfirmedMarketplaceScreen marketplace={repo.marketplace} />
  }

  if (isUnconfirmedMarketplace(repo.marketplace)) {
    return <UnconfirmedMarketplaceScreen marketplace={repo.marketplace} />
  }

  if (isDraftMarketplace(repo.marketplace)) {
    return <DraftMarketplaceScreen marketplace={repo.marketplace} />
  }

  return (
    <ErrorScreen
      error="Please contact our team"
      description="Unsupported marketplace"
    />
  )
}
