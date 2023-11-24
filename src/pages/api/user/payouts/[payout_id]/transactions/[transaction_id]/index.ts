import { getServerSession } from 'next-auth/next'
import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/types/api'
import { getUserPayoutTransactionStatus } from '@/useCases/getUserPayoutTransactionStatus'
import type { NextApiRequest, NextApiResponse } from 'next'

export interface PayoutTransactionStatus {
  status: string
}

export type PayoutTransactionStatusResponse =
  ApiResponse<PayoutTransactionStatus>

// FIXME: It could be good to move this endpoint to [transaction_id]/status
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
      case 'GET':
        return await handleGET(session.userId, req, res)

      default:
        res.status(405)
        res.json({ success: false, ...METHOD_NOT_ALLOWED })
        res.end()
    }
  } catch (e) {
    captureAPIError(e, res)
  }
}

const handleGET = async (
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<PayoutTransactionStatusResponse>
) => {
  if (!req.query.payout_id) {
    throw new Error('Payout ID is required')
  }

  if (!req.query.transaction_id) {
    throw new Error('Transaction ID is required')
  }

  const status = await getUserPayoutTransactionStatus({
    userId: userId,
    userPayoutId: req.query.payout_id.toString(),
    userPayoutTransactionId: req.query.transaction_id.toString(),
  })

  res.status(200)
  res.json({ success: true, data: { status } })
  res.end()
}

export default handler
