import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import { ClientError, UseCaseValidationError } from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class ProductDoesNotExist extends ClientError {
  constructor() {
    super('Product does not exist')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userProductId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

// NOTE: Used only in user product updation API
// Maybe it would be good to extract it to a specific namespace, like user/products/
export const ensureUserProductExists = async (
  request: Request
): Promise<void> => {
  const validationResult = RequestSchema.safeParse(request)

  if (!validationResult.success) {
    const validationErrors = transformZodError(
      validationResult.error.flatten().fieldErrors
    )

    throw new UseCaseValidationError(validationErrors)
  }

  if (!(await isUserExists(validationResult.data.userId))) {
    throw new UserDoesNotExist()
  }

  await ensureProductExists(
    validationResult.data.userId,
    validationResult.data.userProductId
  )
}

const ensureProductExists = async (
  userId: string,
  userProductId: string
): Promise<void> => {
  const product = await prisma.product.findFirst({
    where: {
      sellerId: userId,
      id: userProductId,
    },
  })

  if (!product) {
    throw new ProductDoesNotExist()
  }
}
