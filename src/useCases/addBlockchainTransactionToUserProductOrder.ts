import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import {
  transactionHashErrorMessage,
  validateTransactionHash,
} from '@/validations/transactionHashValidation'
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

export class OrderDoesNotExist extends ClientError {
  constructor() {
    super('Order does not exist')
  }
}

export class OrderWasConfirmed extends ConflictError {
  constructor() {
    super('Order was confirmed')
  }
}

export class OrderWasCancelled extends ConflictError {
  constructor() {
    super('Order was cancelled')
  }
}

export class OrderWasRefunded extends ConflictError {
  constructor() {
    super('Order was refunded')
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

export class PendingOrderHasPendingTransaction extends ConflictError {
  constructor() {
    super('Pending order has pending transaction')
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
    userProductOrderId: z.string().uuid(),
    transactionHash: z
      .string()
      .trim()
      .toLowerCase()
      .refine(validateTransactionHash, {
        message: transactionHashErrorMessage,
      }),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

export const addBlockchainTransactionToUserProductOrder = async (
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

  const order = await prisma.productOrder.findFirst({
    where: {
      buyerId: validationResult.data.userId,
      id: validationResult.data.userProductOrderId,
    },
    include: {
      sellerMarketplace: {
        select: {
          networkId: true,
        },
      },
      transactions: {
        select: {
          confirmedAt: true,
          failedAt: true,
        },
      },
    },
  })

  if (!order) {
    throw new OrderDoesNotExist()
  }

  if (order.confirmedAt) {
    throw new OrderWasConfirmed()
  }

  if (order.cancelledAt) {
    throw new OrderWasCancelled()
  }

  if (order.refundedAt) {
    throw new OrderWasRefunded()
  }

  if (order.pendingAt) {
    if (order.transactions.length === 0) {
      throw new PendingOrderMustHaveTransactions()
    }

    // FIXME: This situation is almost impossible.
    const confirmedTransactions = order.transactions.filter(
      (tx) => tx.confirmedAt
    )

    if (confirmedTransactions.length > 0) {
      throw new PendingOrderMustNotHaveConfirmedTransactions()
    }

    const pendingTransactions = order.transactions.filter(
      (tx) => tx.failedAt === null
    )

    if (pendingTransactions.length > 0) {
      throw new PendingOrderHasPendingTransaction()
    }

    await prisma.productOrderTransaction.create({
      data: {
        productOrderId: order.id,
        networkId: order.sellerMarketplace.networkId,
        hash: validationResult.data.transactionHash,
      },
    })

    return
  }

  if (order.transactions.length > 0) {
    throw new DraftOrderMustNotHaveTransactions()
  }

  const tx = []

  tx.push(
    prisma.productOrder.update({
      data: {
        pendingAt: new Date(),
      },
      where: {
        id: validationResult.data.userProductOrderId,
      },
    })
  )

  tx.push(
    prisma.productOrderTransaction.create({
      data: {
        productOrderId: order.id,
        networkId: order.sellerMarketplace.networkId,
        hash: validationResult.data.transactionHash,
      },
    })
  )

  await prisma.$transaction(tx)
}
