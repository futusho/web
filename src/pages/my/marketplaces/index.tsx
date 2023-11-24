import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { MarketplacesScreen } from '@/screens/user/marketplaces'
import type {
  AvailableBlockchainMarketplace,
  UserMarketplaceItem,
} from '@/types/user-marketplaces'
import { getBlockchainMarketplaces } from '@/useCases/getBlockchainMarketplaces'
import { getUserMarketplaces } from '@/useCases/getUserMarketplaces'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  blockchainMarketplaces?: AvailableBlockchainMarketplace[]
  userMarketplaces?: UserMarketplaceItem[]
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

  if (typeof repo.blockchainMarketplaces === 'undefined') {
    return <p>No blockchain marketplaces</p>
  }

  if (typeof repo.userMarketplaces === 'undefined') {
    return <p>No user marketplaces</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return (
    <MarketplacesScreen
      blockchainMarketplaces={repo.blockchainMarketplaces}
      userMarketplaces={repo.userMarketplaces}
    />
  )
}
