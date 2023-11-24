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

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export interface UserProduct {
  id: string
  title: string
  priceFormatted: string
  categoryTitle: string
  status: string
}

export type Result = UserProduct[]

export const getUserProducts = async (request: Request): Promise<Result> => {
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

  const products = await prisma.product.findMany({
    where: {
      sellerId: validationResult.data.userId,
    },
    include: {
      category: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return products.map((product) => {
    const status = product.publishedAt ? 'published' : 'draft'

    return {
      id: product.id,
      title: product.title,
      priceFormatted: product.priceFormatted,
      categoryTitle: product.category.title,
      status: status,
    }
  })
}
