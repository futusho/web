import type {
  CreatePayoutResponse,
  CreatePayoutRequest,
} from '@/pages/api/user/payouts'
import type {
  CreatePayoutTransactionRequest,
  CreatePayoutTransactionResponse,
} from '@/pages/api/user/payouts/[payout_id]/transactions'
import type { PayoutTransactionStatusResponse } from '@/pages/api/user/payouts/[payout_id]/transactions/[transaction_id]'
import { handleResponse, API_BASE_URL, DEFAULT_HEADERS } from '..'

export const payouts = {
  createPayout: async (
    data: CreatePayoutRequest
  ): Promise<CreatePayoutResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(`${API_BASE_URL}/user/payouts`, payload)

    return handleResponse<CreatePayoutResponse>(response)
  },

  addPayoutTransaction: async (
    userPayoutId: string,
    data: CreatePayoutTransactionRequest
  ): Promise<CreatePayoutTransactionResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(
      `${API_BASE_URL}/user/payouts/${userPayoutId}/transactions`,
      payload
    )

    return handleResponse<CreatePayoutTransactionResponse>(response)
  },

  getPayoutTransactionStatus: async (
    userPayoutId: string,
    userPayoutTransactionId: string
  ): Promise<PayoutTransactionStatusResponse> => {
    const payload = {
      method: 'GET',
      headers: { ...DEFAULT_HEADERS },
    }

    const response = await fetch(
      `${API_BASE_URL}/user/payouts/${userPayoutId}/transactions/${userPayoutTransactionId}`,
      payload
    )

    return handleResponse<PayoutTransactionStatusResponse>(response)
  },
}
