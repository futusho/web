import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Segment, Button, Header, Grid, Form } from 'semantic-ui-react'
import { z } from 'zod'
import type { SubmitHandler } from 'react-hook-form'

const validationSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim(),
  userMarketplaceTokenId: z.string().uuid(),
  productCategoryId: z.string().uuid(),
  price: z.coerce.number().positive(),
})

export type ValidationSchema = z.infer<typeof validationSchema>

export interface SelectOption {
  key: string
  text: string
  value: string
}

type Props = {
  tokens: SelectOption[]
  productCategories: SelectOption[]
  onFormSubmitted(_data: ValidationSchema): void
}

const Component = ({ tokens, productCategories, onFormSubmitted }: Props) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    trigger,
  } = useForm<ValidationSchema>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    defaultValues: {
      title: '',
      description: '',
      userMarketplaceTokenId: '',
      productCategoryId: '',
      price: 0,
    },
  })

  const onSubmit: SubmitHandler<ValidationSchema> = (data) => {
    onFormSubmitted(data)
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Grid stackable columns={1}>
        <Grid.Column>
          <Segment>
            <Header as="h3" content="Enter the title or name" />

            <p>
              This is the main identifier for your product and should accurately
              reflect its content.
            </p>

            <Controller
              name="title"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Form.Input
                  {...field}
                  error={errors.title && errors.title?.message}
                  placeholder=""
                  autoComplete="off"
                  maxLength={100}
                />
              )}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Segment>
            <Header as="h3" content="Provide a detailed description" />

            <p>
              Explain its features, benefits, and any additional information
              that would be valuable to potential buyers.
            </p>

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Form.TextArea
                  {...field}
                  error={errors.description && errors.description?.message}
                  placeholder=""
                  rows={6}
                />
              )}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Segment>
            <Header as="h3" content="Choose the product category" />

            <p>
              Select the category that best represents your product. This helps
              potential buyers find your product when searching and browsing
              through listings. Make sure to choose the most relevant category
              to ensure your product reaches the right audience.
            </p>

            <Form.Select
              {...register('productCategoryId')}
              error={
                errors.productCategoryId && errors.productCategoryId?.message
              }
              options={productCategories}
              placeholder="Please choose"
              width={8}
              onChange={async (_e, { name, value }) => {
                setValue(name, value)
                await trigger(name)
              }}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Segment>
            <Header
              as="h3"
              content="Select the blockchain network and specify the price"
            />

            <p>
              Choose the appropriate currency and set the price that buyers will
              pay to purchase your product.
            </p>

            <Grid stackable columns={2}>
              <Grid.Column width={10}>
                <Header as="h4">Accept payments in:</Header>

                <Form.Select
                  {...register('userMarketplaceTokenId')}
                  error={
                    errors.userMarketplaceTokenId &&
                    errors.userMarketplaceTokenId?.message
                  }
                  options={tokens}
                  placeholder="Please choose"
                  onChange={async (_e, { name, value }) => {
                    setValue(name, value)
                    await trigger(name)
                  }}
                />
              </Grid.Column>

              <Grid.Column width={6}>
                <Header as="h4">Price:</Header>

                <Controller
                  name="price"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Form.Input
                      {...field}
                      error={errors.price && errors.price?.message}
                      placeholder=""
                      autoComplete="off"
                      maxLength={12}
                    />
                  )}
                />
              </Grid.Column>
            </Grid>
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Button
            primary
            content="Customize"
            disabled={isSubmitting || !isValid}
          />
        </Grid.Column>
      </Grid>
    </Form>
  )
}

export default Component
