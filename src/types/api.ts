export type ApiResponse<T> = {
  success: boolean
  message?: string
  errors?: string[]
  data?: T
}
