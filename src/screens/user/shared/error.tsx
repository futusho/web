import React from 'react'
import { Icon, Message } from 'semantic-ui-react'
import { UserLayout } from '@/layouts'

interface Props {
  error: string
  description?: string
  errors?: string[]
}

const Screen = ({ error, description, errors }: Props) => (
  <UserLayout>
    <Message icon negative>
      <Icon name="ban" />

      <Message.Content>
        <Message.Header content={error} />

        {description && <p>{description}</p>}

        {errors && <Message.List items={errors} />}
      </Message.Content>
    </Message>
  </UserLayout>
)

export default Screen
