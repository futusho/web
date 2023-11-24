import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import {
  ClientError,
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

export class RefundedOrderDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Refunded order does not have confirmed transaction')
  }
}

export class CancelledOrderMustNotHaveConfirmedTransactions extends InternalServerError {
  constructor() {
    super('Cancelled order must not have confirmed transactions')
  }
}

export class CancelledOrderMustNotHavePendingTransactions extends InternalServerError {
  constructor() {
    super('Cancelled order must not have pending transactions')
  }
}

export class ConfirmedOrderDoesNotHaveConfirmedTransaction extends InternalServerError {
  constructor() {
    super('Confirmed order does not have confirmed transaction')
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

export class DraftOrderMustNotHaveTransactions extends InternalServerError {
  constructor() {
    super('Draft order must not have transactions')
  }
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

interface Transaction {
  createdAt: Date
  confirmedAt: Date | null
  failedAt: Date | null
}

interface ProductOrder {
  id: string
  productTitle: string
  priceFormatted: string
  createdAt: Date
  pendingAt: Date | null
  confirmedAt: Date | null
  cancelledAt: Date | null
  refundedAt: Date | null
  transactions: Transaction[]
}

export interface UserProductOrder {
  id: string
  productTitle: string
  priceFormatted: string
  status: string
  cancellable: boolean
}

type OrderStatus =
  | 'draft'
  | 'pending'
  | 'awaiting_confirmation'
  | 'refunded'
  | 'cancelled'
  | 'confirmed'

export type Result = UserProductOrder[]

export const getUserProductOrders = async (
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

  const orders = await getProductOrdersForBuyer(validationResult.data.userId)

  return orders.map((order) => ({
    id: order.id,
    productTitle: order.productTitle,
    priceFormatted: order.priceFormatted,
    status: mapOrderStatus(order),
    cancellable: isOrderCancellable(order),
  }))
}

const getProductOrdersForBuyer = async (
  buyerId: string
): Promise<ProductOrder[]> => {
  const productOrders = await prisma.productOrder.findMany({
    where: {
      buyerId: buyerId,
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
      transactions: {
        select: {
          createdAt: true,
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return productOrders.map((productOrder) => ({
    id: productOrder.id,
    productTitle: productOrder.product.title,
    priceFormatted: productOrder.priceFormatted,
    createdAt: productOrder.createdAt,
    pendingAt: productOrder.pendingAt,
    confirmedAt: productOrder.confirmedAt,
    cancelledAt: productOrder.cancelledAt,
    refundedAt: productOrder.refundedAt,
    transactions: productOrder.transactions.map((transaction) => ({
      createdAt: transaction.createdAt,
      confirmedAt: transaction.confirmedAt,
      failedAt: transaction.failedAt,
    })),
  }))
}

const isOrderCancellable = (order: ProductOrder): boolean => {
  if (order.confirmedAt || order.cancelledAt || order.refundedAt) {
    return false
  }

  if (!order.pendingAt) {
    return true
  }

  const unprocessedTransactions = order.transactions.filter(
    (transaction) => transaction.failedAt === null
  )

  return unprocessedTransactions.length === 0
}

const mapOrderStatus = (order: ProductOrder): OrderStatus => {
  const totalTransactions = order.transactions.length

  const confirmedTransactions = order.transactions.filter(
    (transaction) => transaction.confirmedAt !== null
  )

  if (order.refundedAt) {
    if (confirmedTransactions.length !== 1) {
      throw new RefundedOrderDoesNotHaveConfirmedTransaction()
    }

    return 'refunded'
  }

  if (order.cancelledAt) {
    if (totalTransactions === 0) {
      return 'cancelled'
    }

    if (confirmedTransactions.length > 0) {
      throw new CancelledOrderMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = order.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      throw new CancelledOrderMustNotHavePendingTransactions()
    }

    return 'cancelled'
  }

  if (order.confirmedAt) {
    if (confirmedTransactions.length !== 1) {
      throw new ConfirmedOrderDoesNotHaveConfirmedTransaction()
    }

    return 'confirmed'
  }

  if (order.pendingAt) {
    if (totalTransactions === 0) {
      throw new PendingOrderMustHaveTransactions()
    }

    if (confirmedTransactions.length > 0) {
      throw new PendingOrderMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = order.transactions.filter(
      (transaction) => transaction.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      return 'awaiting_confirmation'
    }

    return 'pending'
  }

  if (totalTransactions > 0) {
    throw new DraftOrderMustNotHaveTransactions()
  }

  return 'draft'
}
