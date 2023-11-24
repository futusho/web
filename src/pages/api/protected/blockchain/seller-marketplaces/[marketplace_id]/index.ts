import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED } from '@/lib/api/errors'
import { BlockchainClientFactory } from '@/lib/blockchain/client/BlockchainClientFactory'
import { BlockchainMarketplaceClientFactory } from '@/lib/blockchain/marketplace/BlockchainMarketplaceClientFactory'
import type { ApiResponse } from '@/types/api'
import { updateUserMarketplaceTransactionsFromBlockchainNetwork } from '@/useCases/updateUserMarketplaceTransactionsFromBlockchainNetwork'
import type { NextApiRequest, NextApiResponse } from 'next'

export interface Status {
  status: boolean
}

export type TransactionsResponse = ApiResponse<Status>

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // FIXME: Secure endpoint!
    switch (req.method) {
      case 'POST':
        return await handlePOST(req, res)

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
  req: NextApiRequest,
  res: NextApiResponse<TransactionsResponse>
) => {
  if (!req.query.marketplace_id) {
    throw new Error('Marketplace ID is required')
  }

  await updateUserMarketplaceTransactionsFromBlockchainNetwork(
    new BlockchainClientFactory(),
    new BlockchainMarketplaceClientFactory(),
    {
      networkMarketplaceId: req.query.marketplace_id.toString(),
    }
  )

  const status: Status = {
    status: true,
  }

  res.status(200)
  res.json({ success: true, data: status })
  res.end()
}

export default handler
