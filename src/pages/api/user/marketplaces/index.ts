import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { createDraftUserMarketplace } from '@/useCases/createDraftUserMarketplace'
import { getRecentDraftUserMarketplace } from '@/useCases/getRecentDraftUserMarketplace'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

const userMarketplaceCreationJSONSchema = z
  .object({
    marketplace_id: z.string(),
  })
  .strict()

export type CreateMarketplaceRequest = TypeOf<
  typeof userMarketplaceCreationJSONSchema
>

export type CreateMarketplaceResponse = ApiResponse<{
  id: string
  seller_id: string
  network_id: string
  network_marketplace_id: string
}>

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // FIXME: Extract to middleware
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
  res: NextApiResponse<CreateMarketplaceResponse>
) => {
  // FIXME: Extract to helper function which accepts T generic
  const marketplaceData = userMarketplaceCreationJSONSchema.safeParse(req.body)

  if (!marketplaceData.success) {
    const validationErrors = transformZodError(
      marketplaceData.error.flatten().fieldErrors
    )

    throw new ValidationError(validationErrors)
  }

  await createDraftUserMarketplace({
    userId: userId,
    networkMarketplaceId: marketplaceData.data.marketplace_id,
  })

  const recentMarketplace = await getRecentDraftUserMarketplace({
    userId: userId,
    networkMarketplaceId: marketplaceData.data.marketplace_id,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      id: recentMarketplace.id,
      seller_id: recentMarketplace.sellerId,
      network_id: recentMarketplace.networkId,
      network_marketplace_id: recentMarketplace.networkMarketplaceId,
    },
  })
  res.end()
}

export default handler
