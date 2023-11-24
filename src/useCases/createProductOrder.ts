import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type { BlockchainAddress } from '@/types/blockchain'
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

export class ProductDoesNotExist extends ClientError {
  constructor() {
    super('Product does not exist')
  }
}

export class ProductDoesNotHaveContent extends InternalServerError {
  constructor() {
    super('Product does not have a content')
  }
}

export class SellerMarketplaceIsNotConfirmed extends InternalServerError {
  constructor() {
    super('Seller marketplace is not confirmed')
  }
}

export class SellerMarketplaceDoesNotHaveSmartContractAddress extends InternalServerError {
  constructor() {
    super('Seller marketplace does not have a smart contract address')
  }
}

export class SellerMarketplaceDoesNotHaveOwnerWalletAddress extends InternalServerError {
  constructor() {
    super('Seller marketplace does not have an owner wallet address')
  }
}

export class UnpaidOrderExists extends ConflictError {
  constructor() {
    super('Unpaid order exists. Please pay or cancel the order')
  }
}

interface PaymentDetails {
  sellerMarketplaceId: string
  sellerMarketplaceTokenId: string
  price: number
  priceFormatted: string
  priceDecimals: number
  sellerWalletAddress: BlockchainAddress
}

export const RequestSchema = z
  .object({
    userId: z.string().uuid(),
    productId: z.string().uuid(),
  })
  .strict()

export type Request = TypeOf<typeof RequestSchema>

// FIXME: Rename to createUserProductOrder
export const createProductOrder = async (request: Request): Promise<void> => {
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

  const paymentDetails = await getPaymentDetailsForOrder(
    validationResult.data.productId
  )

  await ensureThereIsNoUnpaidOrderForProduct(
    validationResult.data.userId,
    validationResult.data.productId
  )

  await prisma.productOrder.create({
    data: {
      productId: validationResult.data.productId,
      buyerId: validationResult.data.userId,
      sellerMarketplaceId: paymentDetails.sellerMarketplaceId,
      sellerMarketplaceTokenId: paymentDetails.sellerMarketplaceTokenId,
      price: paymentDetails.price,
      priceDecimals: paymentDetails.priceDecimals,
      priceFormatted: paymentDetails.priceFormatted,
      sellerWalletAddress: paymentDetails.sellerWalletAddress,
    },
  })
}

const getPaymentDetailsForOrder = async (
  productId: string
): Promise<PaymentDetails> => {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      publishedAt: {
        not: null,
      },
    },
    include: {
      sellerMarketplaceToken: {
        include: {
          sellerMarketplace: {
            select: {
              confirmedAt: true,
              smartContractAddress: true,
              ownerWalletAddress: true,
            },
          },
        },
      },
    },
  })

  if (!product) {
    throw new ProductDoesNotExist()
  }

  if (!product.content.trim()) {
    throw new ProductDoesNotHaveContent()
  }

  const sellerMarketplaceToken = product.sellerMarketplaceToken
  const sellerMarketplace = sellerMarketplaceToken.sellerMarketplace

  if (!sellerMarketplace.confirmedAt) {
    throw new SellerMarketplaceIsNotConfirmed()
  }

  if (!sellerMarketplace.smartContractAddress) {
    throw new SellerMarketplaceDoesNotHaveSmartContractAddress()
  }

  if (!sellerMarketplace.ownerWalletAddress) {
    throw new SellerMarketplaceDoesNotHaveOwnerWalletAddress()
  }

  return {
    sellerMarketplaceId: sellerMarketplaceToken.sellerMarketplaceId,
    sellerMarketplaceTokenId: sellerMarketplaceToken.id,
    priceFormatted: product.priceFormatted,
    priceDecimals: product.priceDecimals,
    price: product.price.toNumber(),
    sellerWalletAddress:
      sellerMarketplace.ownerWalletAddress as BlockchainAddress,
  }
}

const ensureThereIsNoUnpaidOrderForProduct = async (
  userId: string,
  productId: string
): Promise<void> => {
  const unpaidOrder = await prisma.productOrder.findFirst({
    where: {
      buyerId: userId,
      productId: productId,
      confirmedAt: null,
      cancelledAt: null,
      refundedAt: null,
    },
  })

  if (unpaidOrder) {
    throw new UnpaidOrderExists()
  }
}
