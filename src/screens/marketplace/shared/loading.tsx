import React from 'react'
import { Icon, Message } from 'semantic-ui-react'
import { MainLayout } from '@/layouts'

const Screen = () => (
  <MainLayout>
    <Message icon>
      <Icon name="spinner" />

      <Message.Content>
        <Message.Header content="Loading screen..." />
      </Message.Content>
    </Message>
  </MainLayout>
)

export default Screen
