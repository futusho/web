import type {
  CreateOrderResponse,
  CreateOrderRequest,
} from '@/pages/api/user/orders'
import type { CancelOrderResponse } from '@/pages/api/user/orders/[order_id]/cancel'
import type {
  CreateOrderTransactionResponse,
  CreateOrderTransactionRequest,
} from '@/pages/api/user/orders/[order_id]/transactions'
import type { ProductOrderTransactionStatusResponse } from '@/pages/api/user/orders/[order_id]/transactions/[transaction_id]'
import { handleResponse, API_BASE_URL, DEFAULT_HEADERS } from '..'

export const orders = {
  placeOrder: async (
    data: CreateOrderRequest
  ): Promise<CreateOrderResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(`${API_BASE_URL}/user/orders`, payload)

    return handleResponse<CreateOrderResponse>(response)
  },

  cancelOrder: async (
    userProductOrderId: string
  ): Promise<CancelOrderResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
    }

    const response = await fetch(
      `${API_BASE_URL}/user/orders/${userProductOrderId}/cancel`,
      payload
    )

    return handleResponse<CancelOrderResponse>(response)
  },

  addOrderTransaction: async (
    userProductOrderId: string,
    data: CreateOrderTransactionRequest
  ): Promise<CreateOrderTransactionResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(
      `${API_BASE_URL}/user/orders/${userProductOrderId}/transactions`,
      payload
    )

    return handleResponse<CreateOrderTransactionResponse>(response)
  },

  getOrderTransactionStatus: async (
    userProductOrderId: string,
    userProductOrderTransactionId: string
  ): Promise<ProductOrderTransactionStatusResponse> => {
    const payload = {
      method: 'GET',
      headers: { ...DEFAULT_HEADERS },
    }

    const response = await fetch(
      `${API_BASE_URL}/user/orders/${userProductOrderId}/transactions/${userProductOrderTransactionId}`,
      payload
    )

    return handleResponse<ProductOrderTransactionStatusResponse>(response)
  },
}
