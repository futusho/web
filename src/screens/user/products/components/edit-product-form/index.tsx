import { zodResolver } from '@hookform/resolvers/zod'
import React, { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useDropArea } from 'react-use'
import {
  Input,
  Icon,
  Table,
  Container,
  Segment,
  Button,
  Tab,
  Message,
  Header,
  Grid,
  Form,
  Card,
  Image,
} from 'semantic-ui-react'
import { z } from 'zod'
import type { EditableProductDetails } from '@/types/user-products'
import type { ChangeEvent } from 'react'
import type { SubmitHandler } from 'react-hook-form'

const validationSchema = z.object({
  userMarketplaceTokenId: z.string().uuid(),
  productCategoryId: z.string().uuid(),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  content: z.string().trim(),
  price: z.coerce.number().positive(),
  coverImagesToDelete: z.array(z.string().min(1)).optional(),
  thumbnailImagesToDelete: z.array(z.string().min(1)).optional(),
  attributes: z.array(
    z.object({
      key: z.string().trim(),
      value: z.string().trim(),
    })
  ),
})

export type ValidationSchema = z.infer<typeof validationSchema>

export interface ProductAttribute {
  key: string
  value: string
}

export interface SelectOption {
  key: string
  text: string
  value: string
}

type Props = {
  product: EditableProductDetails
  tokens: SelectOption[]
  productCategories: SelectOption[]
  onFormSubmitted(
    _data: ValidationSchema,
    _coverImagesToAdd: File[],
    _thumbnailImagesToAdd: File[]
  ): void
  isSubmitting: boolean
}

const Component = ({
  product,
  tokens,
  productCategories,
  onFormSubmitted,
  isSubmitting,
}: Props) => {
  const [productAttributes, setProductAttributes] = useState<
    ProductAttribute[]
  >(product.attributes)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    trigger,
  } = useForm<ValidationSchema>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    defaultValues: {
      userMarketplaceTokenId: product.userMarketplaceTokenId,
      productCategoryId: product.productCategoryId,
      slug: product.slug,
      title: product.title,
      description: product.description,
      content: product.content,
      price: Number(product.price),
      attributes: product.attributes,
      coverImagesToDelete: [],
      thumbnailImagesToDelete: [],
    },
  })

  const addCoverImages = (newFiles: File[]) => {
    newFiles.forEach((file, index) => {
      const fileExists = coverImages.some(
        ({ name, size }) => name === file.name && size === file.size
      )

      if (fileExists) {
        alert(`You already uploaded ${file.name}`)
        newFiles.splice(index)
      }

      if (file.size > 1000000) {
        alert(`${file.name} is too large (1MB max file size).`)
        newFiles.splice(index)
      }
    })

    setCoverImages([...coverImages, ...newFiles])
  }

  const onChangeCoverImages = ({ target }: ChangeEvent<HTMLInputElement>) => {
    if (target.files) {
      const newFiles = Array.from(target.files)

      addCoverImages(newFiles)
    }
  }

  const selectCoverImages = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault()
    coverImageFileInput.current?.click()
  }

  const removeCoverImage = (index: number) => {
    const newFiles = coverImages.filter((_, i) => i !== index)
    setCoverImages(newFiles)
  }

  const addThumbnailImages = (newFiles: File[]) => {
    newFiles.forEach((file, index) => {
      const fileExists = thumbnailImages.some(
        ({ name, size }) => name === file.name && size === file.size
      )

      if (fileExists) {
        alert(`You already uploaded ${file.name}`)
        newFiles.splice(index)
      }

      if (file.size > 1000000) {
        alert(`${file.name} is too large (1MB max file size).`)
        newFiles.splice(index)
      }
    })

    setThumbnailImages([...thumbnailImages, ...newFiles])
  }

  const onChangeThumbnailImages = ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    if (target.files) {
      const newFiles = Array.from(target.files)

      addThumbnailImages(newFiles)
    }
  }

  const selectThumbnailImages = (
    e: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    e.preventDefault()
    thumbnailImageFileInput.current?.click()
  }

  const removeThumbnailImage = (index: number) => {
    const newFiles = thumbnailImages.filter((_, i) => i !== index)
    setThumbnailImages(newFiles)
  }

  const [coverImages, setCoverImages] = useState<File[]>([])
  const coverImageFileInput = useRef<HTMLInputElement>(null)

  const [thumbnailImages, setThumbnailImages] = useState<File[]>([])
  const thumbnailImageFileInput = useRef<HTMLInputElement>(null)

  const [coverImagesBond] = useDropArea({
    onFiles: addCoverImages,
    onUri: () => alert('Files only please!'),
    onText: () => alert('Files only please!'),
  })

  const [thumbnailImagesBond] = useDropArea({
    onFiles: addThumbnailImages,
    onUri: () => alert('Files only please!'),
    onText: () => alert('Files only please!'),
  })

  const [coverImagesToDelete, setCoverImagesToDelete] = useState<string[]>([])
  const [thumbnailImagesToDelete, setThumbnailImagesToDelete] = useState<
    string[]
  >([])

  const onSubmit: SubmitHandler<ValidationSchema> = (data) => {
    const filteredAttributes = productAttributes.filter(
      (attribute) => attribute.key.trim() !== ''
    )

    onFormSubmitted(
      {
        ...data,
        attributes: filteredAttributes,
        coverImagesToDelete: coverImagesToDelete,
        thumbnailImagesToDelete: thumbnailImagesToDelete,
      },
      coverImages,
      thumbnailImages
    )
  }

  const handleDeleteCoverImage = (id: string) => {
    const ids = [...coverImagesToDelete, id].filter(
      (value, index, self) => self.indexOf(value) === index
    )

    setValue('coverImagesToDelete', ids)
    setCoverImagesToDelete(ids)
  }

  const handleDeleteThumbnailImage = (id: string) => {
    const ids = [...thumbnailImagesToDelete, id].filter(
      (value, index, self) => self.indexOf(value) === index
    )

    setValue('thumbnailImagesToDelete', ids)
    setThumbnailImagesToDelete(ids)
  }

  const onUpdateAttributes = (attributes: ProductAttribute[]): void => {
    setProductAttributes(attributes)
    setValue('attributes', attributes)
  }

  const panes = [
    {
      menuItem: { key: 'product-page', icon: 'box', content: 'Product Page' },
      render: () => (
        <Tab.Pane as={Container} style={{ marginTop: '1em' }}>
          <Message info>
            <Message.Content>
              <p>
                In the &quot;Product Page&quot; section, you can control how
                your product looks to buyers. You can make the product card more
                appealing and useful for potential customers. Just remember,
                settings for the product catalog card can be found in
                &quot;Catalog&quot; section, so you can customize different
                parts of how your product is presented.
              </p>
            </Message.Content>
          </Message>

          <Grid stackable columns={1}>
            <Grid.Column>
              <Segment>
                <Header as="h3" content="Enter the title or name" />

                <p>
                  This is the main identifier for your product and should
                  accurately reflect its content.
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
                <Header as="h3" content="Enter a unique and descriptive slug" />

                <p>
                  This will be used in the URL to create a user-friendly and
                  SEO-friendly web address for your product page.
                </p>

                <Controller
                  name="slug"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Form.Input
                      {...field}
                      error={errors.slug && errors.slug?.message}
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
                <Header
                  as="h3"
                  content="Select the blockchain network and specify the price"
                />

                <p>
                  Choose the appropriate currency and set the price that buyers
                  will pay to purchase your product.
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
                      defaultValue={product.userMarketplaceTokenId}
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
              <Segment>
                <Header as="h3" content="Product attributes" />

                <p>Attributes with empty title will be removed.</p>

                <ProductAttributeTable
                  attributes={productAttributes}
                  onUpdateAttributes={onUpdateAttributes}
                />
              </Segment>
            </Grid.Column>

            <Grid.Column>
              <Segment>
                <Header
                  as="h3"
                  content="Upload cover images that provide an attractive visual representation of your product"
                />

                <p>
                  These images often serve as the main visual element on your
                  product page and help to grab buyers&apos; attention. This
                  will ensure that your product is presented attractively across
                  different platforms and devices. The cover image should have a
                  dimension of 1200x645 pixels to ensure optimal display.
                </p>

                <Grid stackable columns={1}>
                  <Grid.Column>
                    <Segment placeholder {...coverImagesBond}>
                      <Header icon>
                        <Icon name="images outline" />
                        Drop images here
                      </Header>

                      <Button
                        primary
                        content="Select images (5 files max.)"
                        onClick={(e) => selectCoverImages(e)}
                      />

                      <input
                        value={[]}
                        accept=".png,.jpg,.jpeg,.gif,.webm"
                        ref={coverImageFileInput}
                        id="files"
                        name="files"
                        type="file"
                        hidden
                        multiple
                        onChange={onChangeCoverImages}
                      />
                    </Segment>
                  </Grid.Column>

                  {coverImages.length > 0 && (
                    <Grid.Column>
                      <Table>
                        <Table.Header>
                          <Table.HeaderCell>Filename</Table.HeaderCell>
                          <Table.HeaderCell>Size</Table.HeaderCell>
                          <Table.HeaderCell />
                        </Table.Header>
                        <Table.Body>
                          {coverImages.map((file, index) => (
                            <Table.Row key={file.name}>
                              <Table.Cell>{file.name}</Table.Cell>
                              <Table.Cell>
                                {(file.size / 1024).toFixed(2)} kb
                              </Table.Cell>
                              <Table.Cell>
                                <Button
                                  negative
                                  size="tiny"
                                  icon="trash"
                                  onClick={() => removeCoverImage(index)}
                                />
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </Grid.Column>
                  )}
                </Grid>
              </Segment>
            </Grid.Column>

            {product.coverImages.length > 0 && (
              <Grid.Column>
                <Segment>
                  <Header as="h3" content="Uploaded cover images" />

                  <Card.Group>
                    {product.coverImages.map((image) => {
                      if (coverImagesToDelete.includes(image.id)) return

                      return (
                        <Card key={image.id}>
                          <Image
                            src={image.url}
                            wrapped
                            ui={false}
                            alt={product.title}
                          />
                          <Card.Content extra>
                            <Button
                              size="small"
                              negative
                              icon="trash"
                              floated="right"
                              onClick={() => handleDeleteCoverImage(image.id)}
                            />
                          </Card.Content>
                        </Card>
                      )
                    })}
                  </Card.Group>
                </Segment>
              </Grid.Column>
            )}
          </Grid>

          {/*}
          <Header
            as="h3"
            content="Choose a preferred page template or layout for your product page"
          />

          <p>
            This determines the overall appearance and structure of your product
            page, including the arrangement of text, images, and other elements.
            Select a template that best suits the style and content of your
            product.
          </p>
          */}
        </Tab.Pane>
      ),
    },
    {
      menuItem: {
        key: 'paid-content',
        icon: 'dollar sign',
        content: 'Post-Purchase Content',
      },
      render: () => (
        <Tab.Pane as={Container} style={{ marginTop: '1em' }}>
          <Message info>
            <Message.Content>
              <p>
                Provide the digital files, documents, or resources that buyers
                will receive once the purchase is complete. This could include
                product downloads, access to online content, or any other
                relevant materials. Ensure that the content adds value to the
                buyer&apos;s purchase and enhances their overall experience.
              </p>
            </Message.Content>
          </Message>

          <Grid stackable columns={1}>
            <Grid.Column>
              <Segment>
                <Header as="h3" content="Content after purchase" />

                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <Form.TextArea
                      {...field}
                      error={errors.content && errors.content?.message}
                      placeholder=""
                      rows={12}
                    />
                  )}
                />
              </Segment>
            </Grid.Column>

            {/*}
            <Grid.Column>
              <Header as="h3" content="Enter a redirect URL (optional)" />

              <p>
                If you&apos;d like to direct buyers to a specific webpage after
                purchase, you can enter the URL here. This could be a thank you
                page, special offers, or any other destination that complements
                the purchasing process. Leave this field blank if you don&apos;t
                wish to redirect buyers. Please ensure that the provided URL is
                accurate and functional.
              </p>

              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <Form.Input
                    {...field}
                    error={errors.content && errors.content?.message}
                    placeholder="Example: https://your-domain/thank-you-page"
                    autoComplete="off"
                    maxLength={255}
                  />
                )}
              />
            </Grid.Column>
            */}
          </Grid>
        </Tab.Pane>
      ),
    },
    {
      menuItem: {
        key: 'catalog',
        icon: 'list',
        content: 'Catalog',
      },
      render: () => (
        <Tab.Pane as={Container} style={{ marginTop: '1em' }}>
          <Message info>
            <Message.Content>
              <p>
                In the &quot;Catalog&quot; section, you can control how your
                product looks to buyers in products catalog. Don&apos;t forget
                to choose right catalog category and upload amazing thumbnail
                images!
              </p>
            </Message.Content>
          </Message>

          <Grid stackable columns={1}>
            <Grid.Column>
              <Segment>
                <Header as="h3" content="Choose the product category" />

                <p>
                  Select the category that best represents your product. This
                  helps potential buyers find your product when searching and
                  browsing through listings. Make sure to choose the most
                  relevant category to ensure your product reaches the right
                  audience.
                </p>

                <Form.Select
                  {...register('productCategoryId')}
                  error={
                    errors.productCategoryId &&
                    errors.productCategoryId?.message
                  }
                  options={productCategories}
                  defaultValue={product.productCategoryId}
                  width={8}
                  placeholder="Please choose"
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
                  content="Upload thumbnail images that represent your product visually"
                />

                <p>
                  Please upload a thumbnail image for your product. These images
                  will be displayed as a preview or thumbnail when your product
                  is listed or showcased in the marketplace. The thumbnail image
                  should have a dimension of 600x600 pixels.
                </p>

                <Grid stackable columns={1}>
                  <Grid.Column>
                    <Segment placeholder {...thumbnailImagesBond}>
                      <Header icon>
                        <Icon name="images outline" />
                        Drop images here
                      </Header>

                      <Button
                        primary
                        content="Select images (3 files max.)"
                        onClick={(e) => selectThumbnailImages(e)}
                      />

                      <input
                        value={[]}
                        accept=".png,.jpg,.jpeg,.gif,.webm"
                        ref={thumbnailImageFileInput}
                        id="files"
                        name="files"
                        type="file"
                        hidden
                        multiple
                        onChange={onChangeThumbnailImages}
                      />
                    </Segment>
                  </Grid.Column>

                  {thumbnailImages.length > 0 && (
                    <Grid.Column>
                      <Table>
                        <Table.Header>
                          <Table.HeaderCell>Filename</Table.HeaderCell>
                          <Table.HeaderCell>Size</Table.HeaderCell>
                          <Table.HeaderCell />
                        </Table.Header>
                        <Table.Body>
                          {thumbnailImages.map((file, index) => (
                            <Table.Row key={file.name}>
                              <Table.Cell>{file.name}</Table.Cell>
                              <Table.Cell>
                                {(file.size / 1024).toFixed(2)} kb
                              </Table.Cell>
                              <Table.Cell>
                                <Button
                                  negative
                                  size="tiny"
                                  icon="trash"
                                  onClick={() => removeThumbnailImage(index)}
                                />
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </Grid.Column>
                  )}
                </Grid>
              </Segment>
            </Grid.Column>

            {product.thumbnailImages.length > 0 && (
              <Grid.Column>
                <Segment>
                  <Header as="h3" content="Uploaded thumbnail images" />

                  <Card.Group>
                    {product.thumbnailImages.map((image) => {
                      if (thumbnailImagesToDelete.includes(image.id)) return

                      return (
                        <Card key={image.id}>
                          <Image
                            src={image.url}
                            wrapped
                            ui={false}
                            alt={product.title}
                          />
                          <Card.Content extra>
                            <Button
                              size="small"
                              negative
                              icon="trash"
                              floated="right"
                              onClick={() =>
                                handleDeleteThumbnailImage(image.id)
                              }
                            />
                          </Card.Content>
                        </Card>
                      )
                    })}
                  </Card.Group>
                </Segment>
              </Grid.Column>
            )}
          </Grid>
        </Tab.Pane>
      ),
    },
  ]

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Tab
        panes={panes}
        menu={{ secondary: true, size: 'large', pointing: true }}
      />

      <Grid stackable columns={1}>
        <Grid.Column>
          <Button
            secondary
            size="large"
            content="Archive"
            disabled={isSubmitting || !isValid}
            floated="right"
          />

          <Button
            positive
            size="large"
            content="Save"
            disabled={isSubmitting || !isValid}
            loading={isSubmitting}
          />
        </Grid.Column>
      </Grid>
    </Form>
  )
}

interface ProductAttributeTableProps {
  attributes: ProductAttribute[]
  onUpdateAttributes: (_attributes: ProductAttribute[]) => void
}

// TODO: Extract to single component
const ProductAttributeTable: React.FC<ProductAttributeTableProps> = ({
  attributes,
  onUpdateAttributes,
}) => {
  const [newAttribute, setNewAttribute] = useState<ProductAttribute>({
    key: '',
    value: '',
  })

  const handleAttributeChange = (
    index: number,
    field: keyof ProductAttribute,
    newValue: string
  ) => {
    const updatedAttributes = [...attributes]
    updatedAttributes[index][field] = newValue
    onUpdateAttributes(updatedAttributes)
  }

  const handleDeleteAttribute = (index: number) => {
    const updatedAttributes = [...attributes]
    updatedAttributes.splice(index, 1)
    onUpdateAttributes(updatedAttributes)
  }

  const handleAddAttribute = () => {
    if (newAttribute.key) {
      const updatedAttributes = [...attributes, newAttribute]
      onUpdateAttributes(updatedAttributes)
      setNewAttribute({ key: '', value: '' })
    }
  }

  return (
    <Table celled>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Title</Table.HeaderCell>
          <Table.HeaderCell>Value</Table.HeaderCell>
          <Table.HeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {attributes.map((attribute, index) => (
          <Table.Row key={index}>
            <Table.Cell>
              <Input
                fluid
                type="text"
                value={attribute.key}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleAttributeChange(index, 'key', e.target.value)
                }
              />
            </Table.Cell>
            <Table.Cell>
              <Input
                fluid
                type="text"
                value={attribute.value}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleAttributeChange(index, 'value', e.target.value)
                }
              />
            </Table.Cell>
            <Table.Cell collapsing>
              <Button
                secondary
                icon="trash"
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteAttribute(index)
                }}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        <Table.Row>
          <Table.Cell>
            <Input
              fluid
              placeholder="Key"
              value={newAttribute.key}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewAttribute({ ...newAttribute, key: e.target.value })
              }
            />
          </Table.Cell>
          <Table.Cell>
            <Input
              fluid
              placeholder="Value"
              value={newAttribute.value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewAttribute({ ...newAttribute, value: e.target.value })
              }
            />
          </Table.Cell>
          <Table.Cell>
            <Button
              primary
              icon="add"
              onClick={(e) => {
                e.preventDefault()
                handleAddAttribute()
              }}
            />
          </Table.Cell>
        </Table.Row>
      </Table.Footer>
    </Table>
  )
}

export default Component
