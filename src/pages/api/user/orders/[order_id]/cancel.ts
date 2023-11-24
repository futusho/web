import { getServerSession } from 'next-auth/next'
import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/types/api'
import { cancelUserProductOrder } from '@/useCases/cancelUserProductOrder'
import type { NextApiRequest, NextApiResponse } from 'next'

export type CancelOrderResponse = ApiResponse<{
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
  res: NextApiResponse<CancelOrderResponse>
) => {
  if (!req.query.order_id) {
    throw new Error('Product order ID is required')
  }

  await cancelUserProductOrder({
    userId: userId,
    userProductOrderId: req.query.order_id.toString(),
  })

  res.status(200)
  res.json({
    success: true,
    data: {
      success: true,
    },
  })
  res.end()
}

export default handler
