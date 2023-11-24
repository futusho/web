import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { transformZodError } from '@/lib/validations'
import type { BlockchainAddress } from '@/types/blockchain'
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

interface TokenBalance {
  available: number
  seller_marketplace_token_id: string
  seller_marketplace_id: string
  seller_marketplace_smart_contract_address: string
  token_smart_contract_address: string | null
  network_title: string
  token_symbol: string
}

export interface TokenBalanceForWithdrawal {
  userMarketplaceId: string
  userMarketplaceTokenId: string
  amountFormatted: string
  networkTitle: string
  marketplaceSmartContractAddress: BlockchainAddress
  tokenSmartContractAddress: BlockchainAddress | null
}

export type Result = TokenBalanceForWithdrawal[]

export const getUserTokenBalanceForWithdrawal = async (
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

  const result = await prisma.$queryRaw<TokenBalance[]>(
    Prisma.sql`
      SELECT COALESCE(seller_income, 0) - COALESCE(pending_payouts, 0) - COALESCE(confirmed_payouts, 0) AS available
        , data.seller_marketplace_token_id
        , data.seller_marketplace_id
        , data.seller_marketplace_smart_contract_address
        , nmt.smart_contract_address AS token_smart_contract_address
        , n.title AS network_title
        , nmt.symbol AS token_symbol
      FROM (
        SELECT COALESCE(SUM(ps.seller_income), 0) AS seller_income
          , ps.seller_marketplace_token_id
          , ps.seller_marketplace_id
          , sm.smart_contract_address AS seller_marketplace_smart_contract_address
          , smt.network_marketplace_token_id
          , sm.network_id
        FROM product_sales ps
        LEFT JOIN seller_marketplace_tokens smt ON smt.id = ps.seller_marketplace_token_id
        LEFT JOIN seller_marketplaces sm ON sm.id = smt.seller_marketplace_id
        LEFT JOIN network_marketplace_tokens nmt ON nmt.id = smt.network_marketplace_token_id
        WHERE ps.seller_id = ${validationResult.data.userId}::UUID
        GROUP BY ps.seller_marketplace_id
          , ps.seller_marketplace_token_id
          , sm.smart_contract_address
          , smt.network_marketplace_token_id
          , sm.network_id
      ) data
      LEFT JOIN (
        SELECT COALESCE(SUM(CASE WHEN confirmed_at IS NOT NULL THEN amount ELSE 0 END), 0) AS confirmed_payouts
          , COALESCE(SUM(CASE WHEN confirmed_at IS NULL THEN amount ELSE 0 END), 0) AS pending_payouts
          , seller_marketplace_id
          , seller_marketplace_token_id
        FROM seller_payouts
        WHERE seller_id = ${validationResult.data.userId}::UUID
          AND cancelled_at IS NULL
        GROUP BY seller_marketplace_id, seller_marketplace_token_id
      ) AS sp ON sp.seller_marketplace_id = data.seller_marketplace_id
        AND sp.seller_marketplace_token_id = data.seller_marketplace_token_id
      LEFT JOIN network_marketplace_tokens nmt ON nmt.id = data.network_marketplace_token_id
      LEFT JOIN networks n ON n.id = data.network_id
    `
  )

  return result.map((row) => ({
    userMarketplaceId: row.seller_marketplace_id,
    userMarketplaceTokenId: row.seller_marketplace_token_id,
    amountFormatted: `${row.available} ${row.token_symbol}`,
    networkTitle: row.network_title,
    marketplaceSmartContractAddress:
      row.seller_marketplace_smart_contract_address as BlockchainAddress,
    tokenSmartContractAddress: row.token_smart_contract_address
      ? (row.token_smart_contract_address as BlockchainAddress)
      : null,
  }))
}
