import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED } from '@/lib/api/errors'
import { BlockchainClientFactory } from '@/lib/blockchain/client/BlockchainClientFactory'
import { BlockchainSellerMarketplaceClientFactory } from '@/lib/blockchain/seller-marketplace/BlockchainSellerMarketplaceClientFactory'
import type { ApiResponse } from '@/types/api'
import { updateUserProductOrderTransactionsFromBlockchainNetwork } from '@/useCases/updateUserProductOrderTransactionsFromBlockchainNetwork'
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
  if (!req.query.network_chain_id) {
    throw new Error('Network Chain ID is required')
  }

  await updateUserProductOrderTransactionsFromBlockchainNetwork(
    new BlockchainClientFactory(),
    new BlockchainSellerMarketplaceClientFactory(),
    {
      networkChainId: +req.query.network_chain_id,
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
