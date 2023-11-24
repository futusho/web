import { getServerSession } from 'next-auth/next'
import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/types/api'
import { getUserMarketplaceStatus } from '@/useCases/getUserMarketplaceStatus'
import type { NextApiRequest, NextApiResponse } from 'next'

export interface MarketplaceStatus {
  status: string
}

export type MarketplaceStatusResponse = ApiResponse<MarketplaceStatus>

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
  buyerId: string,
  req: NextApiRequest,
  res: NextApiResponse<MarketplaceStatusResponse>
) => {
  if (!req.query.marketplace_id) {
    throw new Error('Marketlace ID is required')
  }

  const status = await getUserMarketplaceStatus({
    userId: buyerId,
    userMarketplaceId: req.query.marketplace_id.toString(),
  })

  res.status(200)
  res.json({ success: true, data: { status } })
  res.end()
}

export default handler
