import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from './errors'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class UserDoesNotHaveEmail extends InternalServerError {
  constructor() {
    super('User does not have email')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface Result {
  email: string
  username: string
  displayName: string
  bio: string
  avatarURL: string
  coverImageURL: string
}

export const getUserProfileSettings = async (
  request: Request
): Promise<Result> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  const user = await prisma.user.findUnique({
    where: {
      id: validationResult.data.userId,
    },
  })

  if (!user) {
    throw new UserDoesNotExist()
  }

  // NOTE: By default, prisma uses null for user email, we couldn't skip this check
  if (!user.email) {
    throw new UserDoesNotHaveEmail()
  }

  return {
    displayName: user.name ?? user.username,
    username: user.username,
    email: user.email,
    bio: user.bio ?? '',
    // FIXME: Replace with null both fields
    avatarURL: user.image ?? '',
    coverImageURL: '',
  }
}
