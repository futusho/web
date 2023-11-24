import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { Message, Button, Grid, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { products as ProductsAPI } from '@/lib/api/user/products'
import type {
  ProductCategory,
  UserMarketplaceToken,
} from '@/types/user-products'
import { NewProductForm } from './components'
import type {
  SelectOption,
  ValidationSchema,
} from './components/new-product-form'

interface Props {
  tokens: UserMarketplaceToken[]
  productCategories: ProductCategory[]
}

export default function Screen({ tokens, productCategories }: Props) {
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

  const [createProductError, setCreateProductError] = useState<string>('')
  const [createProductValidationErrors, setCreateProductValidationErrors] =
    useState<string[]>([])

  const handleCreateProduct = async (data: ValidationSchema) => {
    if (!session?.userId) return

    try {
      setCreateProductError('')
      setCreateProductValidationErrors([])

      const response = await ProductsAPI.createProduct({
        product_category_id: data.productCategoryId,
        user_marketplace_token_id: data.userMarketplaceTokenId,
        title: data.title,
        description: data.description,
        price: data.price.toString(),
      })

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.push(`/my/products/${response.data.id}/edit`)
    } catch (e) {
      if (e instanceof APIError) {
        setCreateProductError(e.message)
        setCreateProductValidationErrors(e.validationErrors)
      } else {
        setCreateProductError(`${e}`)
      }
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content="Add New Product" />

      <Grid columns={1} stackable>
        {createProductError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to create product"
              content={createProductError}
            />
          </Grid.Column>
        )}

        {createProductValidationErrors.length > 0 && (
          <Grid.Column>
            <Message
              icon="ban"
              error
              header="Unable to create product"
              list={createProductValidationErrors}
            />
          </Grid.Column>
        )}

        <Grid.Column>
          {productCategoryOptions.length > 0 ? (
            <>
              {tokenOptions.length > 0 ? (
                <NewProductForm
                  tokens={tokenOptions}
                  productCategories={productCategoryOptions}
                  onFormSubmitted={(data) => handleCreateProduct(data)}
                />
              ) : (
                <>
                  <p>Marketplaces were not configured.</p>

                  <p>
                    <Button
                      as="a"
                      href="/my/marketplaces"
                      content="Create a New Marketplace"
                      primary
                    />
                  </p>
                </>
              )}
            </>
          ) : (
            <p>No product categories yet</p>
          )}
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}
