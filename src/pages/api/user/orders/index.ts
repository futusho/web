import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { createProductOrder } from '@/useCases/createProductOrder'
import { getRecentProductOrderForBuyer } from '@/useCases/getRecentProductOrderForBuyer'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const orderCreationJSONSchema = z
  .object({
    product_id: z.string(),
  })
  .strict()

export type CreateOrderRequest = TypeOf<typeof orderCreationJSONSchema>

export type CreateOrderResponse = ApiResponse<{
  id: string
  user_id: string
  product_id: string
  price_formatted: string
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
  res: NextApiResponse<CreateOrderResponse>
) => {
  // FIXME: We can extend captureAPIError function to handle SyntaxError errors when invalid JSON was sent
  const orderData = orderCreationJSONSchema.safeParse(req.body)

  if (!orderData.success) {
    const validationErrors = transformZodError(
      orderData.error.flatten().fieldErrors
    )

    throw new ValidationError(
      validationErrors.concat(orderData.error.flatten().formErrors)
    )
  }

  await createProductOrder({
    userId: userId,
    productId: orderData.data.product_id,
  })

  const recentProductOrder = await getRecentProductOrderForBuyer({
    userId: userId,
    sellerProductId: orderData.data.product_id,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      id: recentProductOrder.id,
      user_id: recentProductOrder.userId,
      product_id: recentProductOrder.productId,
      price_formatted: recentProductOrder.priceFormatted,
    },
  })
  res.end()
}

export default handler
