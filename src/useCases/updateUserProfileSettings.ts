import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import { ClientError, ConflictError, UseCaseValidationError } from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class UsernameIsForbidden extends ConflictError {
  constructor() {
    super('Username is forbidden')
  }
}

export class UsernameIsAlreadyTaken extends ConflictError {
  constructor() {
    super('Username is already taken')
  }
}

const usernameRegex = /^[a-z]([a-z0-9_-]+)$/i

export const FORBIDDEN_USERNAMES = [
  'admin',
  'manager',
  'root',
  'superuser',
  'moderator',
  'support',
  'test',
  'bot',
  'help',
  'anonymous',
  'system',
  'guest',
  'username',
  'user',
]

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    displayName: z.string().trim().min(1),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .refine(
        (value) => {
          if (value.length >= 3 && value.length <= 30) {
            return usernameRegex.test(value)
          }

          return true
        },
        {
          message: 'Invalid username format',
        }
      ),
    bio: z.string().trim(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const updateUserProfileSettings = async (
  request: Request
): Promise<void> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  if (FORBIDDEN_USERNAMES.includes(validationResult.data.username)) {
    throw new UsernameIsForbidden()
  }

  if (!(await isUserExists(validationResult.data.userId))) {
    throw new UserDoesNotExist()
  }

  await ensureUsernameIsAvailable(
    validationResult.data.userId,
    validationResult.data.username
  )

  await prisma.user.update({
    where: {
      id: validationResult.data.userId,
    },
    data: {
      name: validationResult.data.displayName,
      username: validationResult.data.username,
      bio: validationResult.data.bio,
    },
  })
}

const ensureUsernameIsAvailable = async (
  userId: string,
  username: string
): Promise<void> => {
  const usernameIsTaken = await prisma.user.findFirst({
    where: {
      username: username,
      id: {
        not: userId,
      },
    },
  })

  if (usernameIsTaken) {
    throw new UsernameIsAlreadyTaken()
  }
}
