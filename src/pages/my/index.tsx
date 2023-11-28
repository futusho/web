import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { LoadingScreen, UserDashboardScreen } from '@/screens/user'

const Page: React.FC = () => {
  useSession({ required: true })

  const hasMounted = useHasMounted()

  if (!hasMounted) {
    return <LoadingScreen />
  }

  return <UserDashboardScreen />
}

export default Page
