import * as crypto from 'crypto'
import path from 'path'
import multer from 'multer'
import getConfig from 'next/config'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { captureAPIError, ValidationError } from '@/lib/api'
import { METHOD_NOT_ALLOWED, UNAUTHORIZED } from '@/lib/api/errors'
import { authOptions } from '@/lib/auth'
import { transformZodError } from '@/lib/validations'
import type { ApiResponse } from '@/types/api'
import { ensureUserProductExists } from '@/useCases/ensureUserProductExists'
import { getUserProductDetailsForEdit } from '@/useCases/getUserProductDetailsForEdit'
import { updateUserProduct } from '@/useCases/updateUserProduct'
import type { NextApiRequest, NextApiResponse, PageConfig } from 'next'
import type { TypeOf } from 'zod'

const { publicRuntimeConfig } = getConfig()

export const productUpdationJSONSchema = z
  .object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    content: z.string(),
    price: z.string(),
    user_marketplace_token_id: z.string(),
    product_category_id: z.string(),
    delete_cover_images: z.array(z.string()).optional(),
    delete_thumbnail_images: z.array(z.string()).optional(),
    attributes: z.string().trim().optional(),
  })
  .strict()

export type UpdateProductRequest = TypeOf<typeof productUpdationJSONSchema>

interface NextApiRequestExtended extends NextApiRequest {
  files: {
    covers: Express.Multer.File[]
    thumbnails: Express.Multer.File[]
  }
}

interface ProductImage {
  id: string
  url: string
}

export type UpdateProductResponse = ApiResponse<{
  id: string
  user_id: string
  user_marketplace_token_id: string
  product_category_id: string
  slug: string
  title: string
  description: string
  content: string
  price: string
  cover_images: ProductImage[]
  thumbnail_images: ProductImage[]
}>

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
}

const uploadsDirectory = 'public/uploads'

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (req, file, cb) => {
    const productId = req.query.id as string

    // Generate a unique filename based on the current timestamp, file type
    // (cover or thumbnail), and a hash of the original filename. This ensures
    // avoidance of overwriting existing files and handles cases where a user
    // uploads the same file for cover and thumbnail simultaneously.

    const hash = crypto
      .createHash('md5')
      .update(file.originalname)
      .digest('hex')

    const uniqueSuffix =
      Date.now() + '-' + hash + path.extname(file.originalname)

    cb(null, `product-${productId}-${file.fieldname}-${uniqueSuffix}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024, // 1 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ]

    const isValidType = allowedImageTypes.includes(file.mimetype)

    if (isValidType) {
      cb(null, true)
    } else {
      cb(new Error('Invalid image type'))
    }
  },
})

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
  res: NextApiResponse<UpdateProductResponse>
) => {
  if (!req.query.id) {
    throw new Error('Product ID is required')
  }

  const productId = req.query.id as string

  await ensureUserProductExists({
    userId: userId,
    userProductId: productId,
  })

  const middleware = upload.fields([
    { name: 'covers', maxCount: 5 },
    { name: 'thumbnails', maxCount: 3 },
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware(req as any, res as any, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            res.status(413)
            res.json({
              success: false,
              message: err.message,
            })
            res.end()
            return

          default:
            res.status(400)
            res.json({
              success: false,
              message: err.message,
            })
            res.end()
            return
        }
      } else if (err) {
        res.status(400)
        res.json({
          success: false,
          message: err.message,
        })
        res.end()
        return
      }

      const productData = productUpdationJSONSchema.safeParse(req.body)

      if (!productData.success) {
        const validationErrors = transformZodError(
          productData.error.flatten().fieldErrors
        )

        throw new ValidationError(validationErrors)
      }

      const { files } = req as NextApiRequestExtended

      const coverImageURLs = files.covers
        ? files.covers.map((file) =>
            file.path.replace(
              uploadsDirectory,
              publicRuntimeConfig.domain + '/uploads'
            )
          )
        : []

      const thumbnailImageURLs = files.thumbnails
        ? files.thumbnails.map((file) =>
            file.path.replace(
              uploadsDirectory,
              publicRuntimeConfig.domain + '/uploads'
            )
          )
        : []

      await updateUserProduct({
        productId: productId,
        userId: userId,
        userMarketplaceTokenId: productData.data.user_marketplace_token_id,
        productCategoryId: productData.data.product_category_id,
        productSlug: productData.data.slug,
        productTitle: productData.data.title,
        productDescription: productData.data.description,
        productContent: productData.data.content,
        productPrice: productData.data.price,
        coverImageURLsToAdd: coverImageURLs,
        coverImageIdsToDelete: productData.data.delete_cover_images,
        thumbnailImageURLsToAdd: thumbnailImageURLs,
        thumbnailImageIdsToDelete: productData.data.delete_thumbnail_images,
        attributes: productData.data.attributes
          ? JSON.parse(productData.data.attributes)
          : [],
      })

      const productDetails = await getUserProductDetailsForEdit({
        userId: userId,
        userProductId: productId,
      })

      res.status(200)
      res.json({
        success: true,
        data: {
          id: productDetails.id,
          user_id: userId,
          user_marketplace_token_id: productDetails.userMarketplaceTokenId,
          product_category_id: productDetails.productCategoryId,
          slug: productDetails.slug,
          title: productDetails.title,
          description: productDetails.description,
          content: productDetails.content,
          // FIXME: Update with price formatted to be consistent with POST method
          // Or add both prices.
          price: productDetails.price,
          cover_images: productDetails.coverImages,
          thumbnail_images: productDetails.thumbnailImages,
        },
      })
      res.end()
    } catch (e) {
      captureAPIError(e, res)
    }
  })
}

export default handler
