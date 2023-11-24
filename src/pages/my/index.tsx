import { useSession } from 'next-auth/react'
import React from 'react'
import { useHasMounted } from '@/hooks'
import { UserDashboardScreen } from '@/screens/user'

const Page: React.FC = () => {
  useSession({ required: true })

  const hasMounted = useHasMounted()

  if (!hasMounted) {
    return <p>Loading...</p>
  }

  return <UserDashboardScreen />
}

export default Page
