import React from 'react'
import { Icon, Message } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'

const Screen = () => (
  <UserLayout>
    <Message icon>
      <Icon name="spinner" />

      <Message.Content>
        <Message.Header content="Loading screen..." />
      </Message.Content>
    </Message>
  </UserLayout>
)

export default Screen
