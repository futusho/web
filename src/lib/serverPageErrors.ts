import { ClientError, UseCaseValidationError } from '@/useCases/errors'

export interface ServerPageErrors {
  errorMessage?: string
  useCaseErrors?: string[]
}

export const captureServerPageError = (e: unknown): ServerPageErrors => {
  if (e instanceof UseCaseValidationError) {
    return { useCaseErrors: e.errors }
  }

  if (e instanceof ClientError) {
    return { errorMessage: e.message }
  }

  return { errorMessage: `${e}` }
}
