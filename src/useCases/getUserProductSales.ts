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

export interface UserProductSale {
  id: string
  productOrderId: string
  productTitle: string
  networkTitle: string
  buyerDisplayName: string
  sellerIncomeFormatted: string
  platformIncomeFormatted: string
  date: string
}

export type Result = UserProductSale[]

// FIXME: Add tests
export const getUserProductSales = async (
  request: Request
): Promise<Result> => {
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

  const sales = await prisma.productSale.findMany({
    where: {
      sellerId: validationResult.data.userId,
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
      sellerMarketplace: {
        include: {
          network: {
            select: {
              title: true,
            },
          },
        },
      },
      productOrderTransaction: {
        include: {
          productOrder: {
            include: {
              buyer: {
                select: {
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return sales.map((sale) => ({
    id: sale.id,
    productOrderId: sale.productOrderTransaction.productOrder.id,
    productTitle: sale.product.title,
    networkTitle: sale.sellerMarketplace.network.title,
    buyerDisplayName: sale.productOrderTransaction.productOrder.buyer.name
      ? sale.productOrderTransaction.productOrder.buyer.name
      : sale.productOrderTransaction.productOrder.buyer.username,
    sellerIncomeFormatted: sale.sellerIncomeFormatted,
    platformIncomeFormatted: sale.platformIncomeFormatted,
    date: sale.createdAt.toISOString(),
  }))
}
