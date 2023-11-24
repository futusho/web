import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Grid, Message, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { orders as OrderAPI } from '@/lib/api/user/orders'
import type { UserProductOrderItem } from '@/types/user-orders'
import { OrdersTable } from './components'

interface Props {
  orders: UserProductOrderItem[]
}

const Screen = ({ orders }: Props) => {
  const router = useRouter()

  const [cancelOrderError, setCancelOrderError] = useState<string>('')
  const [cancelOrderValidationErrors, setCancelOrderValidationErrors] =
    useState<string[]>([])

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancelOrderError('')
      setCancelOrderValidationErrors([])

      const response = await OrderAPI.cancelOrder(orderId)

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.reload()
    } catch (e) {
      if (e instanceof APIError) {
        setCancelOrderError(e.message)
        setCancelOrderValidationErrors(e.validationErrors)
      } else {
        setCancelOrderError(`${e}`)
      }
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content="Orders" />

      <Grid columns={1} stackable>
        {cancelOrderError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to cancel order"
              content={cancelOrderError}
            />
          </Grid.Column>
        )}

        {cancelOrderValidationErrors.length > 0 && (
          <Grid.Column>
            <Message
              icon="ban"
              error
              header="Unable to cancel order"
              list={cancelOrderValidationErrors}
            />
          </Grid.Column>
        )}

        <Grid.Column>
          {orders.length ? (
            <OrdersTable
              orders={orders}
              onCancelOrder={(orderId: string) => handleCancelOrder(orderId)}
            />
          ) : (
            <p>No orders yet</p>
          )}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}

export default Screen
