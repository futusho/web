import { getServerSession } from 'next-auth/next'
import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { authOptions } from '@/lib/auth'
import { ProfileSettingsScreen } from '@/screens/user/settings'
import type { Profile } from '@/types/user-settings'
import { getUserProfileSettings } from '@/useCases/getUserProfileSettings'
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'

type Repo = {
  profile?: Profile
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

    const userProfile = await getUserProfileSettings({
      userId: user.userId,
    })

    return {
      props: {
        repo: {
          profile: userProfile,
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

  if (!repo.profile) {
    return <p>Unable to get user profile</p>
  }

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <ProfileSettingsScreen profile={repo.profile} />
}
