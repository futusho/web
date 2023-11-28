import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { captureServerPageError } from '@/lib/serverPageErrors'
import type { ServerPageErrors } from '@/lib/serverPageErrors'
import { ErrorScreen, LoadingScreen, MarketplacesScreen } from '@/screens/user'
import type {
  AvailableBlockchainMarketplace,
  UserMarketplaceItem,
} from '@/types/user-marketplaces'
import { getBlockchainMarketplaces } from '@/useCases/getBlockchainMarketplaces'
import { getUserMarketplaces } from '@/useCases/getUserMarketplaces'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = ServerPageErrors & {
  blockchainMarketplaces?: AvailableBlockchainMarketplace[]
  userMarketplaces?: UserMarketplaceItem[]
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

    const blockchainMarketplaces = await getBlockchainMarketplaces()
    const userMarketplaces = await getUserMarketplaces({ userId: user.userId })

    return {
      props: {
        repo: {
          blockchainMarketplaces: blockchainMarketplaces,
          userMarketplaces: userMarketplaces,
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

  if (!Array.isArray(repo.blockchainMarketplaces)) {
    return (
      <ErrorScreen
        error="Error"
        description="Unable to load blockchain marketplaces"
      />
    )
  }

  if (!Array.isArray(repo.userMarketplaces)) {
    return (
      <ErrorScreen
        error="Error"
        description="Unable to load user marketplaces"
      />
    )
  }

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return (
    <MarketplacesScreen
      blockchainMarketplaces={repo.blockchainMarketplaces}
      userMarketplaces={repo.userMarketplaces}
    />
  )
}
