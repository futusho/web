import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { addBlockchainTransactionToUserMarketplace } from '@/useCases/addBlockchainTransactionToUserMarketplace'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const transactionCreationJSONSchema = z
  .object({
    tx_hash: z.string(),
  })
  .strict()

export type CreateMarketplaceTransactionRequest = TypeOf<
  typeof transactionCreationJSONSchema
>

export type CreateMarketplaceTransactionResponse = ApiResponse<{
  success: boolean
}>

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.userId) {
      res.status(401)
      res.json({ success: false, ...UNAUTHORIZED })
      res.end()
      return
    }

    switch (req.method) {
      case 'POST':
        return await handlePOST(session.userId, req, res)

      default:
        res.status(405)
        res.json({ success: false, ...METHOD_NOT_ALLOWED })
        res.end()
    }
  } catch (e) {
    captureAPIError(e, res)
  }
}

const handlePOST = async (
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<CreateMarketplaceTransactionResponse>
) => {
  if (!req.query.marketplace_id) {
    throw new Error('Marketplace ID is required')
  }

  const transactionData = transactionCreationJSONSchema.safeParse(req.body)

  if (!transactionData.success) {
    const validationErrors = transformZodError(
      transactionData.error.flatten().fieldErrors
    )

    // FIXME: I need to unify this piece of code across all API endpoints
    throw new ValidationError(
      validationErrors.concat(transactionData.error.flatten().formErrors)
    )
  }

  await addBlockchainTransactionToUserMarketplace({
    userId: userId,
    userMarketplaceId: req.query.marketplace_id.toString(),
    transactionHash: transactionData.data.tx_hash,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      success: true,
    },
  })
  res.end()
}

export default handler
