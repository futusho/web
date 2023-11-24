import { Prisma } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'
import type { ApiResponse } from '@/types/api'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  DATABASE_ERROR,
  DATABASE_IS_NOT_READY,
  UNHANDLED_ERROR,
} from './errors'
import type { NextApiResponse } from 'next'

export class APIError extends Error {
  validationErrors: string[]

  constructor(message: string, validationErrors: string[]) {
    super(message)
    this.name = 'APIError'
    this.validationErrors = validationErrors
  }
}

export class ValidationError extends Error {
  errors: string[]

  constructor(errors: string[]) {
    super()
    this.errors = errors
  }
}

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

export const API_BASE_URL = '/api'

// NOTE: Used on frontend side only
export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  const errorData: ApiResponse<T> = await response.json()

  // FIXME: Extend supported status codes (419, etc.)
  if (
    response.status === 422 ||
    response.status === 400 ||
    response.status === 409
  ) {
    if (errorData.errors) {
      throw new APIError(errorData.message || '', errorData.errors)
    }
  }

  throw new Error(errorData.message)
}

// NOTE: Used on backend side only
export const captureAPIError = async (e: unknown, res: NextApiResponse) => {
  Sentry.captureException(e)

  if (e instanceof ValidationError) {
    res.status(400)
    res.json({
      success: false,
      errors: e.errors,
    })
    return res.end()
  }

  if (e instanceof UseCaseValidationError) {
    res.status(422)
    res.json({
      success: false,
      errors: e.errors,
    })
    return res.end()
  }

  if (e instanceof ConflictError) {
    res.status(409)
    res.json({
      success: false,
      message: e.message,
    })
    return res.end()
  }

  if (e instanceof ClientError) {
    res.status(400)
    res.json({
      success: false,
      message: e.message,
    })
    return res.end()
  }

  if (e instanceof InternalServerError) {
    res.status(500)
    res.json({
      success: false,
      message: e.message,
    })
    return res.end()
  }

  res.status(500)
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2023': {
        res.json({ success: false, message: 'Invalid UUID' })
        break
      }
      default:
        res.json({ success: false, ...DATABASE_ERROR })
    }
  } else if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({ success: false, ...DATABASE_IS_NOT_READY })
  } else {
    res.json({ success: false, ...UNHANDLED_ERROR })
  }

  return res.end()
}
