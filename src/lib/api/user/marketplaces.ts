import type {
  CreateMarketplaceResponse,
  CreateMarketplaceRequest,
} from '@/pages/api/user/marketplaces'
import type { MarketplaceStatusResponse } from '@/pages/api/user/marketplaces/[marketplace_id]/status'
import type {
  CreateMarketplaceTransactionResponse,
  CreateMarketplaceTransactionRequest,
} from '@/pages/api/user/marketplaces/[marketplace_id]/transactions'
import { handleResponse, API_BASE_URL, DEFAULT_HEADERS } from '..'

export const marketplaces = {
  createMarketplace: async (
    data: CreateMarketplaceRequest
  ): Promise<CreateMarketplaceResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(`${API_BASE_URL}/user/marketplaces`, payload)

    return handleResponse<CreateMarketplaceResponse>(response)
  },

  addMarketplaceTransaction: async (
    userMarketplaceId: string,
    data: CreateMarketplaceTransactionRequest
  ): Promise<CreateMarketplaceTransactionResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(
      `${API_BASE_URL}/user/marketplaces/${userMarketplaceId}/transactions`,
      payload
    )

    return handleResponse<CreateMarketplaceTransactionResponse>(response)
  },

  getMarketplaceStatus: async (
    userMarketplaceId: string
  ): Promise<MarketplaceStatusResponse> => {
    const payload = {
      method: 'GET',
      headers: { ...DEFAULT_HEADERS },
    }

    const response = await fetch(
      `${API_BASE_URL}/user/marketplaces/${userMarketplaceId}/status`,
      payload
    )

    return handleResponse<MarketplaceStatusResponse>(response)
  },
}
