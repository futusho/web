import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { getUserProfileSettings } from '@/useCases/getUserProfileSettings'
import { updateUserProfileSettings } from '@/useCases/updateUserProfileSettings'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const settingsUpdationJSONSchema = z
  .object({
    username: z.string(),
    display_name: z.string(),
    bio: z.string(),
  })
  .strict()

export type UpdateSettingsRequest = TypeOf<typeof settingsUpdationJSONSchema>

export type UpdateSettingsResponse = ApiResponse<{
  email: string
  username: string
  display_name: string
  bio: string
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
      case 'PUT':
        return await handlePUT(session.userId, req, res)

      default:
        res.status(405)
        res.json({ success: false, ...METHOD_NOT_ALLOWED })
        res.end()
    }
  } catch (e) {
    captureAPIError(e, res)
  }
}

const handlePUT = async (
  userId: string,
  req: NextApiRequest,
  res: NextApiResponse<UpdateSettingsResponse>
) => {
  const productData = settingsUpdationJSONSchema.safeParse(req.body)

  if (!productData.success) {
    const validationErrors = transformZodError(
      productData.error.flatten().fieldErrors
    )

    throw new ValidationError(validationErrors)
  }

  await updateUserProfileSettings({
    userId: userId,
    username: productData.data.username,
    displayName: productData.data.display_name,
    bio: productData.data.bio,
  })

  const userProfile = await getUserProfileSettings({
    userId: userId,
  })

  res.status(200)
  res.json({
    success: true,
    data: {
      email: userProfile.email,
      username: userProfile.username,
      display_name: userProfile.displayName,
      bio: userProfile.bio,
    },
  })
  res.end()
}

export default handler
