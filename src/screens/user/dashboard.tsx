import React from 'react'
import { Header } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'

const Screen: React.FC = () => (
  <UserLayout>
    <Header as="h1" content="Welcome to your dashboard!" />

    <p>
      We&apos;re excited to have you onboard and look forward to helping you
      succeed on FutúSho!
    </p>
  </UserLayout>
)

export default Screen
