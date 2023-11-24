import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { createUserPayout } from '@/useCases/createUserPayout'
import { getRecentUserPayout } from '@/useCases/getRecentUserPayout'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const payoutCreationJSONSchema = z
  .object({
    user_marketplace_id: z.string(),
    user_marketplace_token_id: z.string(),
  })
  .strict()

export type CreatePayoutRequest = TypeOf<typeof payoutCreationJSONSchema>

export type CreatePayoutResponse = ApiResponse<{
  id: string
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
  res: NextApiResponse<CreatePayoutResponse>
) => {
  // FIXME: We can extend captureAPIError function to handle SyntaxError errors when invalid JSON was sent
  const payoutData = payoutCreationJSONSchema.safeParse(req.body)

  if (!payoutData.success) {
    const validationErrors = transformZodError(
      payoutData.error.flatten().fieldErrors
    )

    throw new ValidationError(
      validationErrors.concat(payoutData.error.flatten().formErrors)
    )
  }

  await createUserPayout({
    userId: userId,
    userMarketplaceId: payoutData.data.user_marketplace_id,
    userMarketplaceTokenId: payoutData.data.user_marketplace_token_id,
  })

  const recentUserPayout = await getRecentUserPayout({
    userId: userId,
    userMarketplaceId: payoutData.data.user_marketplace_id,
    userMarketplaceTokenId: payoutData.data.user_marketplace_token_id,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      id: recentUserPayout.id,
    },
  })
  res.end()
}

export default handler
