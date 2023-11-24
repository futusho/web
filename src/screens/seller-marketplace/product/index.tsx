import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import {
  Table,
  Segment,
  Grid,
  Button,
  Header,
  Image,
  Message,
  Divider,
  List,
  Label,
} from 'semantic-ui-react'
import { MainLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { orders as OrdersAPI } from '@/lib/api/user/orders'
import { SignInDialog } from '@/screens/shared/components'
import type { ProductDetails, SellerDetails } from '@/types/seller-marketplace'
// import { SingleProductRating } from '../components'
import { ProductDescriptionWidget } from './ProductDescriptionWidget'

interface Props {
  product: ProductDetails
  seller: SellerDetails
}

export default function Screen({ product, seller }: Props) {
  const router = useRouter()
  const { data: session } = useSession()

  const [selectedCoverImageURL, setSelectedCoverImageURL] = useState<string>(
    product.covers.length > 0 ? product.covers[0] : ''
  )

  const [isOpen, setIsOpen] = useState<boolean>(false)

  const [createOrderError, setCreateOrderError] = useState<string>('')
  const [createOrderValidationErrors, setCreateOrderValidationErrors] =
    useState<string[]>([])

  const handlePlaceOrder = async () => {
    try {
      setCreateOrderError('')
      setCreateOrderValidationErrors([])

      const response = await OrdersAPI.placeOrder({
        product_id: product.id,
      })

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.push(`/my/orders/${response.data.id}`)
    } catch (e) {
      if (e instanceof APIError) {
        setCreateOrderError(e.message)
        setCreateOrderValidationErrors(e.validationErrors)
      } else {
        setCreateOrderError(`${e}`)
      }
    }
  }

  const changeCoverImage = (coverImageURL: string) => {
    setSelectedCoverImageURL(coverImageURL)
  }

  return (
    <MainLayout showMenu={!!session}>
      <Grid stackable columns={1}>
        {product.covers.length > 0 && (
          <>
            <Grid.Column>
              <Image
                src={selectedCoverImageURL}
                alt={product.title}
                rounded
                bordered
                fluid
                centered
              />
            </Grid.Column>

            {product.covers.length > 1 && (
              <Grid.Column textAlign="center">
                <Image.Group size="small">
                  {product.covers.map((cover, index) => (
                    <Image
                      key={index}
                      rounded
                      src={cover}
                      alt={product.title}
                      bordered
                      verticalAlign="top"
                      onClick={() => changeCoverImage(cover)}
                    />
                  ))}
                </Image.Group>

                <Divider />
              </Grid.Column>
            )}
          </>
        )}

        <Grid.Column textAlign="center">
          <Header as="h1">{product.title}</Header>
        </Grid.Column>

        <Grid.Row columns={2}>
          <Grid.Column width={11}>
            <Grid padded columns={1}>
              <Grid.Column verticalAlign="middle">
                <List horizontal divided>
                  <List.Item>
                    <Header as="h4">
                      <Link href={seller.profileURL}>
                        <Image
                          verticalAlign="middle"
                          avatar
                          src={seller.avatarURL}
                          title={seller.displayName}
                          alt={seller.displayName}
                          inline
                        />
                        {` ${seller.displayName}`}
                      </Link>
                    </Header>
                  </List.Item>

                  <List.Item>
                    <Label tag>{product.priceFormatted}</Label>
                  </List.Item>

                  <List.Item>
                    <Label>{product.networkTitle}</Label>
                  </List.Item>
                </List>
              </Grid.Column>

              <ProductDescriptionWidget
                productDescription={product.description}
              />
            </Grid>
          </Grid.Column>

          <Grid.Column width={5}>
            <Grid columns={1}>
              <Grid.Column textAlign="center">
                <Segment secondary>
                  <Header as="h2">{product.priceFormatted}</Header>

                  {session && session.user ? (
                    <>
                      {createOrderError && (
                        <Message error>
                          <Message.Header content="Unable to place order" />
                          <p>{createOrderError}</p>
                        </Message>
                      )}

                      {createOrderValidationErrors.length > 0 && (
                        <Message
                          error
                          header="Validation errors"
                          list={createOrderValidationErrors}
                        />
                      )}

                      <Button
                        size="large"
                        primary
                        onClick={() => handlePlaceOrder()}
                        content="I want this!"
                      />
                    </>
                  ) : (
                    <>
                      <p>Please sign in to purchase this product.</p>

                      <p>
                        <Button
                          size="large"
                          primary
                          onClick={() => setIsOpen(true)}
                          content="Sign In or Create Account"
                        />
                      </p>
                    </>
                  )}
                </Segment>
              </Grid.Column>

              {product.attributes.length > 0 && (
                <Grid.Column>
                  <Table basic stackable>
                    <Table.Body>
                      {product.attributes.map((attribute) => (
                        <Table.Row key={attribute.key}>
                          {attribute.value ? (
                            <>
                              <Table.Cell collapsing>
                                <Header as="h4">
                                  <Header.Content>
                                    {attribute.key}
                                  </Header.Content>
                                </Header>
                              </Table.Cell>
                              <Table.Cell textAlign="right">
                                {attribute.value}
                              </Table.Cell>
                            </>
                          ) : (
                            <Table.Cell colSpan={2}>
                              <Header as="h4">
                                <Header.Content>{attribute.key}</Header.Content>
                              </Header>
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </Grid.Column>
              )}

              {/*}
              <Grid.Column>
                <SingleProductRating rating={product.ratings} />
              </Grid.Column>
              */}
            </Grid>
          </Grid.Column>
        </Grid.Row>
      </Grid>

      {!session && <SignInDialog open={isOpen} setOpen={setIsOpen} />}
    </MainLayout>
  )
}
