import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import {
  ClientError,
  ConflictError,
  InternalServerError,
  UseCaseValidationError,
} from './errors'
import { isUserExists } from './helpers'
import type { TypeOf } from 'zod'

export class UserDoesNotExist extends ClientError {
  constructor() {
    super('User does not exist')
  }
}

export class ProductOrderDoesNotExist extends ClientError {
  constructor() {
    super('Order does not exist')
  }
}

export class ProductOrderCannotBeCancelled extends ConflictError {
  constructor() {
    super('Order cannot be cancelled')
  }
}

export class DraftOrderMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft order must not have transactions')
  }
}

export class PendingOrderMustHaveTransactions extends InternalServerError {
  constructor() {
    super('Pending order must have transactions')
  }
}

export class PendingOrderMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Pending order must not have confirmed transactions')
  }
}

interface Transaction {
  confirmedAt: Date | null
  failedAt: Date | null
}

interface ProductOrder {
  pendingAt: Date | null
  confirmedAt: Date | null
  cancelledAt: Date | null
  refundedAt: Date | null
  transactions: Transaction[]
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    userProductOrderId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const cancelUserProductOrder = async (
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

  const productOrder = await getProductOrderForBuyer(
    validationResult.data.userId,
    validationResult.data.userProductOrderId
  )

  if (!isOrderCancellable(productOrder)) {
    throw new ProductOrderCannotBeCancelled()
  }

  await prisma.productOrder.update({
    data: {
      cancelledAt: new Date(),
    },
    where: {
      id: validationResult.data.userProductOrderId,
    },
  })
}

const getProductOrderForBuyer = async (
  userId: string,
  userProductOrderId: string
): Promise<ProductOrder> => {
  const productOrder = await prisma.productOrder.findFirst({
    where: {
      buyerId: userId,
      id: userProductOrderId,
    },
    include: {
      transactions: {
        select: {
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
  })

  if (!productOrder) {
    throw new ProductOrderDoesNotExist()
  }

  return {
    pendingAt: productOrder.pendingAt,
    confirmedAt: productOrder.confirmedAt,
    cancelledAt: productOrder.cancelledAt,
    refundedAt: productOrder.refundedAt,
    transactions: productOrder.transactions.map((transaction) => ({
      confirmedAt: transaction.confirmedAt,
      failedAt: transaction.failedAt,
    })),
  }
}

const isOrderCancellable = (order: ProductOrder): boolean => {
  if (order.confirmedAt || order.cancelledAt || order.refundedAt) {
    return false
  }

  if (!order.pendingAt) {
    if (order.transactions.length > 0) {
      throw new DraftOrderMustNotHaveTransactions()
    }

    return true
  }

  if (order.transactions.length === 0) {
    throw new PendingOrderMustHaveTransactions()
  }

  const confirmedTransactions = order.transactions.filter(
    (transaction) => transaction.confirmedAt !== null
  )

  if (confirmedTransactions.length > 0) {
    throw new PendingOrderMustNotHaveConfirmedTransactions()
  }

  const pendingTransactions = order.transactions.filter(
    (transaction) => transaction.failedAt === null
  )

  return pendingTransactions.length === 0
}
