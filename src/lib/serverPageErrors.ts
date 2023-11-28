import { Prisma } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
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

  // We want to capture either unknown or server errors
  Sentry.captureException(e)

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return { errorMessage: 'Database error' }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return { errorMessage: 'Database is not ready' }
  }

  return { errorMessage: `${e}` }
}
