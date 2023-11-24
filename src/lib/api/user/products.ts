import type {
  CreateProductResponse,
  CreateProductRequest,
} from '@/pages/api/user/products'
import type {
  UpdateProductResponse,
  UpdateProductRequest,
} from '@/pages/api/user/products/[id]'
import { handleResponse, API_BASE_URL, DEFAULT_HEADERS } from '..'

export const products = {
  createProduct: async (
    data: CreateProductRequest
  ): Promise<CreateProductResponse> => {
    const payload = {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS },
      body: JSON.stringify(data),
    }

    const response = await fetch(`${API_BASE_URL}/user/products`, payload)

    return handleResponse<CreateProductResponse>(response)
  },

  updateProduct: async (
    productId: string,
    data: UpdateProductRequest,
    coverImagesToAdd: File[],
    thumbnailImagesToAdd: File[]
  ): Promise<UpdateProductResponse> => {
    const formData = new FormData()

    formData.append('product_category_id', data.product_category_id)
    formData.append('user_marketplace_token_id', data.user_marketplace_token_id)
    formData.append('slug', data.slug)
    formData.append('title', data.title)
    formData.append('description', data.description)
    formData.append('content', data.content)
    formData.append('price', data.price)
    formData.append('attributes', data.attributes ? data.attributes : '')

    if (data.delete_cover_images) {
      data.delete_cover_images.forEach((value, index) => {
        formData.append(`delete_cover_images[${index}]`, value)
      })
    }

    if (data.delete_thumbnail_images) {
      data.delete_thumbnail_images.forEach((value, index) => {
        formData.append(`delete_thumbnail_images[${index}]`, value)
      })
    }

    if (coverImagesToAdd.length > 0) {
      coverImagesToAdd.forEach((value) => {
        formData.append('covers', value)
      })
    }

    if (thumbnailImagesToAdd.length > 0) {
      thumbnailImagesToAdd.forEach((value) => {
        formData.append('thumbnails', value)
      })
    }

    const payload = {
      method: 'PUT',
      body: formData,
    }

    const response = await fetch(
      `${API_BASE_URL}/user/products/${productId}`,
      payload
    )

    return handleResponse<UpdateProductResponse>(response)
  },
}
