import Link from 'next/link'
import React from 'react'
import { List, Grid, Image, Header } from 'semantic-ui-react'
import { MainLayout } from '@/layouts'
import type { ProductItem, SellerCard } from '@/types/seller-marketplace'
import { ProductCards } from '../components'

interface Props {
  seller: SellerCard
  products: ProductItem[]
}

export default function Screen({ seller, products }: Props) {
  return (
    <MainLayout>
      <Grid stackable columns={1}>
        {seller.coverImageURL && (
          <Grid.Column verticalAlign="middle">
            <Image
              src={seller.coverImageURL}
              width={800}
              height={450}
              alt={seller.displayName}
            />
          </Grid.Column>
        )}

        <Grid.Column verticalAlign="middle">
          <List horizontal divided>
            <List.Item>
              <Header as="h1">
                <Link href={seller.profileURL}>
                  {seller.avatarImageURL && (
                    <Image
                      verticalAlign="middle"
                      src={seller.avatarImageURL}
                      width={32}
                      height={32}
                      alt={seller.displayName}
                      avatar
                      inline
                    />
                  )}
                  {` ${seller.displayName}`}
                </Link>
              </Header>
            </List.Item>
          </List>
        </Grid.Column>

        <Grid.Column verticalAlign="middle">
          {seller.bio && <Header as="h3" content={seller.bio} />}
        </Grid.Column>

        {products.length > 0 && (
          <Grid.Column>
            <ProductCards products={products} />
          </Grid.Column>
        )}
      </Grid>
    </MainLayout>
  )
}
