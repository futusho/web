import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { createUserProduct } from '@/useCases/createUserProduct'
import { getRecentUserProduct } from '@/useCases/getRecentUserProduct'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { TypeOf } from 'zod'

export const productCreationJSONSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    price: z.string(),
    user_marketplace_token_id: z.string(),
    product_category_id: z.string(),
  })
  .strict()

export type CreateProductRequest = TypeOf<typeof productCreationJSONSchema>

export type CreateProductResponse = ApiResponse<{
  id: string
  user_id: string
  user_marketplace_token_id: string
  product_category_id: string
  slug: string
  title: string
  description: string
  content: string
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
  res: NextApiResponse<CreateProductResponse>
) => {
  const productData = productCreationJSONSchema.safeParse(req.body)

  if (!productData.success) {
    const validationErrors = transformZodError(
      productData.error.flatten().fieldErrors
    )

    throw new ValidationError(validationErrors)
  }

  await createUserProduct({
    userId: userId,
    userMarketplaceTokenId: productData.data.user_marketplace_token_id,
    productCategoryId: productData.data.product_category_id,
    productTitle: productData.data.title,
    productDescription: productData.data.description,
    productPrice: productData.data.price,
  })

  const recentUserProduct = await getRecentUserProduct({
    userId: userId,
    userMarketplaceTokenId: productData.data.user_marketplace_token_id,
    productCategoryId: productData.data.product_category_id,
  })

  res.status(201)
  res.json({
    success: true,
    data: {
      id: recentUserProduct.id,
      user_id: recentUserProduct.userId,
      product_category_id: recentUserProduct.productCategoryId,
      user_marketplace_token_id: recentUserProduct.userMarketplaceTokenId,
      slug: recentUserProduct.slug,
      title: recentUserProduct.title,
      description: recentUserProduct.description,
      content: recentUserProduct.content,
      price_formatted: recentUserProduct.priceFormatted,
    },
  })
  res.end()
}

export default handler
