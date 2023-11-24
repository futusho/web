import React from 'react'
import { Grid, Header, Card } from 'semantic-ui-react'
import { MainLayout } from '@/layouts'
import type { ProductCategoryItem } from '@/types/marketplace-product-categories'

interface Props {
  categories: ProductCategoryItem[]
}

export default function Screen({ categories }: Props) {
  return (
    <MainLayout>
      <Grid container columns={1} stackable relaxed padded>
        <Grid.Column textAlign="center">
          <Header as="h1" content="All Product Categories on FutúSho" />
        </Grid.Column>

        <Grid.Column textAlign="center" style={{ fontSize: '1.2em' }}>
          <p>
            Discover a diverse collection of digital products created by our
            talented community members. From captivating graphics and versatile
            templates to innovative audio and software solutions, our products
            are here to enhance your creativity and simplify your digital world.
          </p>
        </Grid.Column>

        <Grid.Column>
          {categories.length > 0 ? (
            <Card.Group itemsPerRow={3} stackable>
              {categories.map((category) => (
                <Card
                  key={category.id}
                  as="a"
                  href={category.productCategoryURL}
                >
                  <Card.Content header={category.title} />
                  <Card.Content description={category.description} />
                </Card>
              ))}
            </Card.Group>
          ) : (
            <p>No categories yet</p>
          )}
        </Grid.Column>
      </Grid>
    </MainLayout>
  )
}
