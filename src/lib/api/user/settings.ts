import type {
  UpdateSettingsResponse,
  UpdateSettingsRequest,
} from '@/pages/api/user/settings'
import { handleResponse, API_BASE_URL, DEFAULT_HEADERS } from '..'

export const settings = {
  updateProfile: async (
    data: UpdateSettingsRequest
  ): Promise<UpdateSettingsResponse> => {
    const payload = {
      method: 'PUT',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(`${API_BASE_URL}/user/settings`, payload)

    return handleResponse<UpdateSettingsResponse>(response)
  },
}
