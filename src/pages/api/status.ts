import { captureAPIError } from '@/lib/api'
import { METHOD_NOT_ALLOWED } from '@/lib/api/errors'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types/api'
import type { NextApiRequest, NextApiResponse } from 'next'

interface StatusResponse {
  success: boolean
  status?: string
  message?: string
}

export type StatusApiResponse = ApiResponse<StatusResponse>

interface IDBStatusResponse {
  success: boolean
}

type DBStatusResponse = IDBStatusResponse[]

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<StatusApiResponse>
) => {
  if (req.method !== 'GET') {
    res.status(405)
    res.json({ success: false, ...METHOD_NOT_ALLOWED })
    res.end()
    return
  }

  try {
    const result: DBStatusResponse =
      await prisma.$queryRaw`SELECT true AS success`

    res.status(200)
    res.json({ success: result[0].success })
    res.end()
  } catch (e) {
    captureAPIError(e, res)
  }
}

export default handler
