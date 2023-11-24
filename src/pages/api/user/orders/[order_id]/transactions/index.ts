import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { addBlockchainTransactionToUserProductOrder } from '@/useCases/addBlockchainTransactionToUserProductOrder'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const transactionCreationJSONSchema = z
  .object({
    tx_hash: z.string(),
  })
  .strict()

export type CreateOrderTransactionRequest = TypeOf<
  typeof transactionCreationJSONSchema
>

export type CreateOrderTransactionResponse = ApiResponse<{
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
  res: NextApiResponse<CreateOrderTransactionResponse>
) => {
  if (!req.query.order_id) {
    throw new Error('Order ID is required')
  }

  const transactionData = transactionCreationJSONSchema.safeParse(req.body)

  if (!transactionData.success) {
    const validationErrors = transformZodError(
      transactionData.error.flatten().fieldErrors
    )

    throw new ValidationError(
      validationErrors.concat(transactionData.error.flatten().formErrors)
    )
  }

  const orderId = req.query.order_id as string

  await addBlockchainTransactionToUserProductOrder({
    userId: userId,
    userProductOrderId: orderId,
    transactionHash: transactionData.data.tx_hash,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      // FIXME: Return created transaction
      success: true,
    },
  })
  res.end()
}

export default handler
