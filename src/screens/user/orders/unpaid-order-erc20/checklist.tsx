import React from 'react'
import { List } from 'semantic-ui-react'
import type { DraftOrderERC20, PendingOrderERC20 } from '@/types/user-orders'

interface Props {
  order: DraftOrderERC20 | PendingOrderERC20
}

export const Checklist = ({ order }: Props) => (
  <List divided relaxed>
    <List.Item>
      <List.Icon name="spinner" loading verticalAlign="middle" />
      <List.Content>
        <List.Header>Agree with terms and conditions</List.Header>
        <List.Description>
          Please make sure you have read this checklist carefully
        </List.Description>
      </List.Content>
    </List.Item>

    <List.Item>
      <List.Icon name="wait" verticalAlign="middle" />
      <List.Content>
        <List.Header>Connect wallet</List.Header>
        <List.Description>
          We need to verify that you are connected to the {order.networkTitle}
        </List.Description>
      </List.Content>
    </List.Item>

    <List.Item>
      <List.Icon name="wait" verticalAlign="middle" />
      <List.Content>
        <List.Header>Check tokens balance</List.Header>
        <List.Description>
          We need to verify that your account has enough tokens (
          {order.priceFormatted})
        </List.Description>
      </List.Content>
    </List.Item>

    <List.Item>
      <List.Icon name="wait" verticalAlign="middle" />
      <List.Content>
        <List.Header>Check tokens allowance</List.Header>
        <List.Description>
          We need to verify your tokens allowance to make a payment
        </List.Description>
      </List.Content>
    </List.Item>

    <List.Item>
      <List.Icon name="wait" verticalAlign="middle" />
      <List.Content>
        <List.Header>Make a payment</List.Header>
        <List.Description>
          In this step you have to confirm payment transaction in your wallet
        </List.Description>
      </List.Content>
    </List.Item>

    <List.Item>
      <List.Icon name="wait" verticalAlign="middle" />
      <List.Content>
        <List.Header>Wait for a confirmation</List.Header>
        <List.Description>
          When your transaction is confirmed, you will have access to your{' '}
          {order.productTitle}
        </List.Description>
      </List.Content>
    </List.Item>
  </List>
)
