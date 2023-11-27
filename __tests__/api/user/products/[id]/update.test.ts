import * as crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import cookieParser from 'cookie-parser'
import express from 'express'
import request from 'supertest'
import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/products/[id]'
import { cleanDatabase, createUserWithSession } from '../../../../helpers'
import type {
  Product,
  ProductCategory,
  SellerMarketplaceToken,
  ProductImage,
} from '@prisma/client'

const ENDPOINT = '/api/user/products/[id]'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`PUT ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it.todo('returns error')
  })

  describe('when authorized', () => {
    let sessionToken: string, userId: string

    beforeEach(async () => {
      const { sessionToken: _sessionToken, userId: _userId } =
        await createUserWithSession()

      sessionToken = _sessionToken
      userId = _userId
    })

    describe('when product does not exist', () => {
      it.todo('returns error')
    })

    describe('when product exists', () => {
      let product: Product,
        anotherProductCategory: ProductCategory,
        userMarketplace2Token: SellerMarketplaceToken

      beforeEach(async () => {
        const network1 = await prisma.network.create({
          data: {
            title: 'Network1',
            chainId: 1,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        const network2 = await prisma.network.create({
          data: {
            title: 'Network2',
            chainId: 2,
            blockchainExplorerURL: 'https://localhost',
          },
        })

        const network1Marketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network1.id,
            smartContractAddress: '0xDEADBEEF',
            commissionRate: 1,
          },
        })

        const network2Marketplace = await prisma.networkMarketplace.create({
          data: {
            networkId: network2.id,
            smartContractAddress: '0xBEEF',
            commissionRate: 2,
          },
        })

        const network1MarketplaceCoin =
          await prisma.networkMarketplaceToken.create({
            data: {
              marketplaceId: network1Marketplace.id,
              decimals: 18,
              symbol: 'COIN1',
            },
          })

        const network2MarketplaceCoin =
          await prisma.networkMarketplaceToken.create({
            data: {
              marketplaceId: network2Marketplace.id,
              decimals: 18,
              symbol: 'COIN2',
            },
          })

        const userMarketplace1 = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network1.id,
            networkMarketplaceId: network1Marketplace.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
          },
        })

        const userMarketplace2 = await prisma.sellerMarketplace.create({
          data: {
            sellerId: userId,
            networkId: network2.id,
            networkMarketplaceId: network2Marketplace.id,
            smartContractAddress: '',
            ownerWalletAddress: '',
          },
        })

        const userMarketplace1Token =
          await prisma.sellerMarketplaceToken.create({
            data: {
              sellerMarketplaceId: userMarketplace1.id,
              networkMarketplaceTokenId: network1MarketplaceCoin.id,
            },
          })

        userMarketplace2Token = await prisma.sellerMarketplaceToken.create({
          data: {
            sellerMarketplaceId: userMarketplace2.id,
            networkMarketplaceTokenId: network2MarketplaceCoin.id,
          },
        })

        const productCategory = await prisma.productCategory.create({
          data: {
            slug: 'category',
            title: 'Category',
            description: 'Description',
          },
        })

        anotherProductCategory = await prisma.productCategory.create({
          data: {
            slug: 'another-category',
            title: 'Another Category',
            description: 'Another Description',
          },
        })

        product = await prisma.product.create({
          data: {
            sellerId: userId,
            sellerMarketplaceTokenId: userMarketplace1Token.id,
            categoryId: productCategory.id,
            slug: 'product',
            title: 'Product',
            price: 0.099919,
            priceDecimals: 18,
            priceFormatted: '0.099919 COIN',
            attributes: [
              {
                key: 'Format',
                value: 'MOBI',
              },
            ],
          },
        })
      })

      describe('when product does not have images', () => {
        describe('when images have not been attached', () => {
          it('updates only product attributes', async () => {
            const app = express()

            app.use(cookieParser())

            app.put(`/api/user/products/${product.id}`, handler)

            const response = await request(app)
              .put(`/api/user/products/${product.id}`)
              .query({ id: product.id })
              .set('Cookie', `next-auth.session-token=${sessionToken}`)
              .field('slug', ' new-slug ')
              .field('title', ' New Title ')
              .field('description', ' New Description ')
              .field('content', ' New Content ')
              .field('price', '42.099919')
              .field('product_category_id', anotherProductCategory.id)
              .field('user_marketplace_token_id', userMarketplace2Token.id)

            expect(response.status).toBe(200)

            const json = response.body

            expect(json).toEqual({
              success: true,
              data: {
                id: expect.any(String),
                user_id: userId,
                product_category_id: anotherProductCategory.id,
                user_marketplace_token_id: userMarketplace2Token.id,
                slug: 'new-slug',
                title: 'New Title',
                description: 'New Description',
                content: 'New Content',
                price: '42.099919',
                cover_images: [],
                thumbnail_images: [],
              },
            })

            const updatedProduct = await prisma.product.findUnique({
              where: {
                id: json.data.id,
              },
              include: {
                productImages: true,
              },
            })

            if (!updatedProduct) {
              throw new Error('User product does not exist')
            }

            expect(updatedProduct.slug).toEqual('new-slug')
            expect(updatedProduct.title).toEqual('New Title')
            expect(updatedProduct.description).toEqual('New Description')
            expect(updatedProduct.content).toEqual('New Content')
            expect(updatedProduct.price.toString()).toEqual('42.099919')
            expect(updatedProduct.priceDecimals).toEqual(18)
            expect(updatedProduct.priceFormatted).toEqual('42.099919 COIN2')
            expect(updatedProduct.categoryId).toEqual(anotherProductCategory.id)
            expect(updatedProduct.sellerMarketplaceTokenId).toEqual(
              userMarketplace2Token.id
            )
            expect(updatedProduct.publishedAt).not.toBeNull()
            expect(updatedProduct.productImages).toHaveLength(0)
            expect(updatedProduct.attributes).toEqual([])
          })
        })

        describe('with attached images', () => {
          it('updates product', async () => {
            const app = express()

            app.use(cookieParser())

            app.put(`/api/user/products/${product.id}`, handler)

            const coverImageFileStream = fs.createReadStream(
              path.join(__dirname, 'cover.png')
            )
            const thumbnailImageFileStream = fs.createReadStream(
              path.join(__dirname, 'thumbnail.png')
            )

            const response = await request(app)
              .put(`/api/user/products/${product.id}`)
              .query({ id: product.id })
              .set('Cookie', `next-auth.session-token=${sessionToken}`)
              .field('slug', ' new-slug ')
              .field('title', ' New Title ')
              .field('description', ' New Description ')
              .field('content', ' New Content ')
              .field('price', '42.099919')
              .field('product_category_id', anotherProductCategory.id)
              .field('user_marketplace_token_id', userMarketplace2Token.id)
              .attach('covers', coverImageFileStream)
              .attach('thumbnails', thumbnailImageFileStream)

            expect(response.status).toBe(200)

            const json = response.body

            expect(json).toEqual({
              success: true,
              data: {
                id: expect.any(String),
                user_id: userId,
                product_category_id: anotherProductCategory.id,
                user_marketplace_token_id: userMarketplace2Token.id,
                slug: 'new-slug',
                title: 'New Title',
                description: 'New Description',
                content: 'New Content',
                price: '42.099919',
                cover_images: expect.any(Array),
                thumbnail_images: expect.any(Array),
              },
            })

            const updatedProduct = await prisma.product.findUnique({
              where: {
                id: product.id,
              },
            })

            if (!updatedProduct) {
              throw new Error('User product does not exist')
            }

            expect(updatedProduct.slug).toEqual('new-slug')
            expect(updatedProduct.title).toEqual('New Title')
            expect(updatedProduct.description).toEqual('New Description')
            expect(updatedProduct.content).toEqual('New Content')
            expect(updatedProduct.price.toString()).toEqual('42.099919')
            expect(updatedProduct.priceDecimals).toEqual(18)
            expect(updatedProduct.priceFormatted).toEqual('42.099919 COIN2')
            expect(updatedProduct.categoryId).toEqual(anotherProductCategory.id)
            expect(updatedProduct.sellerMarketplaceTokenId).toEqual(
              userMarketplace2Token.id
            )
            expect(updatedProduct.publishedAt).not.toBeNull()
            expect(updatedProduct.attributes).toEqual([])

            const productCoverImages = await prisma.productImage.findMany({
              where: {
                productId: product.id,
                type: 'cover',
              },
            })

            expect(productCoverImages).toHaveLength(1)
            expect(
              productCoverImages[0].url.startsWith(
                `http://localhost:3000/uploads/product-${product.id}-covers-`
              )
            ).toBeTruthy()

            const coverHash = crypto
              .createHash('md5')
              .update('cover.png')
              .digest('hex')

            expect(
              productCoverImages[0].url.endsWith(`-${coverHash}.png`)
            ).toBeTruthy()

            const productThumbnailImages = await prisma.productImage.findMany({
              where: {
                productId: product.id,
                type: 'thumbnail',
              },
            })

            expect(productThumbnailImages).toHaveLength(1)
            expect(
              productThumbnailImages[0].url.startsWith(
                `http://localhost:3000/uploads/product-${product.id}-thumbnails-`
              )
            ).toBeTruthy()

            const thumbnailHash = crypto
              .createHash('md5')
              .update('thumbnail.png')
              .digest('hex')

            expect(
              productThumbnailImages[0].url.endsWith(`-${thumbnailHash}.png`)
            ).toBeTruthy()
          })
        })
      })

      describe('when product has images', () => {
        let productCoverImage1: ProductImage,
          productCoverImage2: ProductImage,
          productThumbnailImage1: ProductImage,
          productThumbnailImage2: ProductImage

        beforeEach(async () => {
          productCoverImage1 = await prisma.productImage.create({
            data: {
              productId: product.id,
              type: 'cover',
              url: 'http://localhost/cover1.png',
            },
          })

          productCoverImage2 = await prisma.productImage.create({
            data: {
              productId: product.id,
              type: 'cover',
              url: 'http://localhost/cover1.png',
            },
          })

          productThumbnailImage1 = await prisma.productImage.create({
            data: {
              productId: product.id,
              type: 'thumbnail',
              url: 'http://localhost/thumbnail1.png',
            },
          })

          productThumbnailImage2 = await prisma.productImage.create({
            data: {
              productId: product.id,
              type: 'thumbnail',
              url: 'http://localhost/thumbnail2.png',
            },
          })
        })

        describe('when request has all attributes and fields', () => {
          it('updates product', async () => {
            const app = express()

            app.use(cookieParser())

            app.put(`/api/user/products/${product.id}`, handler)

            const coverImageFileStream = fs.createReadStream(
              path.join(__dirname, 'cover.png')
            )
            const thumbnailImageFileStream = fs.createReadStream(
              path.join(__dirname, 'thumbnail.png')
            )

            const response = await request(app)
              .put(`/api/user/products/${product.id}`)
              .query({ id: product.id })
              .set('Cookie', `next-auth.session-token=${sessionToken}`)
              .field('slug', ' new-slug ')
              .field('title', ' New Title ')
              .field('description', ' New Description ')
              .field('content', ' New Content ')
              .field('price', '42.099919')
              .field('product_category_id', anotherProductCategory.id)
              .field('user_marketplace_token_id', userMarketplace2Token.id)
              .field(
                'attributes',
                JSON.stringify([
                  { key: ' Format ', value: ' PDF ' },
                  { key: ' Pages ', value: ' 42 ' },
                ])
              )
              .field('delete_cover_images[0]', productCoverImage2.id)
              .field('delete_thumbnail_images[0]', productThumbnailImage2.id)
              .attach('covers', coverImageFileStream)
              .attach('thumbnails', thumbnailImageFileStream)

            expect(response.status).toBe(200)

            const json = response.body

            expect(json).toEqual({
              success: true,
              data: {
                id: expect.any(String),
                user_id: userId,
                product_category_id: anotherProductCategory.id,
                user_marketplace_token_id: userMarketplace2Token.id,
                slug: 'new-slug',
                title: 'New Title',
                description: 'New Description',
                content: 'New Content',
                price: '42.099919',
                cover_images: expect.any(Array),
                thumbnail_images: expect.any(Array),
              },
            })

            const updatedProduct = await prisma.product.findUnique({
              where: {
                id: product.id,
              },
              include: {
                productImages: {
                  select: {
                    id: true,
                    url: true,
                    type: true,
                  },
                },
              },
            })

            if (!updatedProduct) {
              throw new Error('User product does not exist')
            }

            expect(updatedProduct.slug).toEqual('new-slug')
            expect(updatedProduct.title).toEqual('New Title')
            expect(updatedProduct.description).toEqual('New Description')
            expect(updatedProduct.content).toEqual('New Content')
            expect(updatedProduct.price.toString()).toEqual('42.099919')
            expect(updatedProduct.priceDecimals).toEqual(18)
            expect(updatedProduct.priceFormatted).toEqual('42.099919 COIN2')
            expect(updatedProduct.categoryId).toEqual(anotherProductCategory.id)
            expect(updatedProduct.sellerMarketplaceTokenId).toEqual(
              userMarketplace2Token.id
            )
            expect(updatedProduct.attributes).toEqual([
              {
                key: 'Format',
                value: 'PDF',
              },
              {
                key: 'Pages',
                value: '42',
              },
            ])

            const productCovers = updatedProduct.productImages.filter(
              (image) => image.type === 'cover'
            )

            expect(productCovers[0].id).toEqual(productCoverImage1.id)
            expect(productCovers[0].url).toEqual(productCoverImage1.url)

            expect(productCovers[1].id).not.toEqual(productCoverImage2.id)
            expect(productCovers[1].url).not.toEqual(productCoverImage2.url)

            const productThumbnails = updatedProduct.productImages.filter(
              (image) => image.type === 'thumbnail'
            )

            expect(productThumbnails[0].id).toEqual(productThumbnailImage1.id)
            expect(productThumbnails[0].url).toEqual(productThumbnailImage1.url)

            expect(productThumbnails[1].id).not.toEqual(
              productThumbnailImage2.id
            )
            expect(productThumbnails[1].url).not.toEqual(
              productThumbnailImage2.url
            )
          })
        })

        describe('when image deletion requested', () => {
          it('updates product', async () => {
            const app = express()

            app.use(cookieParser())

            app.put(`/api/user/products/${product.id}`, handler)

            const response = await request(app)
              .put(`/api/user/products/${product.id}`)
              .query({ id: product.id })
              .set('Cookie', `next-auth.session-token=${sessionToken}`)
              .field('slug', ' new-slug ')
              .field('title', ' New Title ')
              .field('description', ' New Description ')
              .field('content', ' New Content ')
              .field('price', '42.099919')
              .field('product_category_id', anotherProductCategory.id)
              .field('user_marketplace_token_id', userMarketplace2Token.id)
              .field('delete_cover_images', [
                productCoverImage1.id,
                productCoverImage2.id,
              ])
              .field('delete_thumbnail_images', [
                productThumbnailImage1.id,
                productThumbnailImage2.id,
              ])

            expect(response.status).toBe(200)

            const json = response.body

            expect(json).toEqual({
              success: true,
              data: {
                id: expect.any(String),
                user_id: userId,
                product_category_id: anotherProductCategory.id,
                user_marketplace_token_id: userMarketplace2Token.id,
                slug: 'new-slug',
                title: 'New Title',
                description: 'New Description',
                content: 'New Content',
                price: '42.099919',
                cover_images: expect.any(Array),
                thumbnail_images: expect.any(Array),
              },
            })

            const updatedProduct = await prisma.product.findUnique({
              where: {
                id: product.id,
              },
              include: {
                productImages: true,
              },
            })

            if (!updatedProduct) {
              throw new Error('User product does not exist')
            }

            expect(updatedProduct.slug).toEqual('new-slug')
            expect(updatedProduct.title).toEqual('New Title')
            expect(updatedProduct.description).toEqual('New Description')
            expect(updatedProduct.content).toEqual('New Content')
            expect(updatedProduct.price.toString()).toEqual('42.099919')
            expect(updatedProduct.priceDecimals).toEqual(18)
            expect(updatedProduct.priceFormatted).toEqual('42.099919 COIN2')
            expect(updatedProduct.categoryId).toEqual(anotherProductCategory.id)
            expect(updatedProduct.sellerMarketplaceTokenId).toEqual(
              userMarketplace2Token.id
            )
            expect(updatedProduct.productImages).toEqual([])
          })
        })
      })
    })
  })
})
