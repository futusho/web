import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { Message, Grid, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { products as ProductsAPI } from '@/lib/api/user/products'
import type {
  EditableProductDetails,
  ProductCategory,
  UserMarketplaceToken,
} from '@/types/user-products'
import { EditProductForm } from './components'
import type {
  SelectOption,
  ValidationSchema,
} from './components/edit-product-form'

interface Props {
  product: EditableProductDetails
  tokens: UserMarketplaceToken[]
  productCategories: ProductCategory[]
}

const Screen = ({ product, tokens, productCategories }: Props) => {
  const router = useRouter()
  const { data: session } = useSession()

  const tokenOptions: SelectOption[] = tokens.map((token) => ({
    key: token.id,
    text: token.displayName,
    value: token.id,
  }))

  const productCategoryOptions: SelectOption[] = productCategories.map(
    (productCategory) => ({
      key: productCategory.id,
      text: productCategory.title,
      value: productCategory.id,
    })
  )

  const [updateProductError, setUpdateProductError] = useState<string>('')
  const [updateProductValidationErrors, setUpdateProductValidationErrors] =
    useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleUpdateProduct = async (
    data: ValidationSchema,
    coverImagesToAdd: File[],
    thumbnailImagesToAdd: File[]
  ) => {
    if (!session?.userId) return

    setIsSubmitting(true)

    try {
      setUpdateProductError('')
      setUpdateProductValidationErrors([])

      const response = await ProductsAPI.updateProduct(
        product.id,
        {
          product_category_id: data.productCategoryId,
          user_marketplace_token_id: data.userMarketplaceTokenId,
          slug: data.slug,
          title: data.title,
          description: data.description,
          content: data.content,
          price: data.price.toString(),
          delete_cover_images: data.coverImagesToDelete,
          delete_thumbnail_images: data.thumbnailImagesToDelete,
          attributes: JSON.stringify(data.attributes),
        },
        coverImagesToAdd,
        thumbnailImagesToAdd
      )

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.reload()
    } catch (e) {
      if (e instanceof APIError) {
        setUpdateProductError(e.message)
        setUpdateProductValidationErrors(e.validationErrors)
      } else {
        setUpdateProductError(`${e}`)
      }

      setIsSubmitting(false)
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content={product.title} />

      <Grid columns={1} stackable>
        {updateProductError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to update product"
              content={updateProductError}
            />
          </Grid.Column>
        )}

        {updateProductValidationErrors.length > 0 && (
          <Grid.Column>
            <Message
              icon="ban"
              error
              header="Unable to update product"
              list={updateProductValidationErrors}
            />
          </Grid.Column>
        )}

        <Grid.Column>
          <EditProductForm
            product={product}
            tokens={tokenOptions}
            productCategories={productCategoryOptions}
            isSubmitting={isSubmitting}
            onFormSubmitted={(data, files1, files2) =>
              handleUpdateProduct(data, files1, files2)
            }
          />
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}

export default Screen
