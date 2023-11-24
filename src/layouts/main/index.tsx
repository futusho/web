import React from 'react'
import { Container, Grid, Segment } from 'semantic-ui-react'
import { Footer, Menu as TopMenu } from '@/layouts/shared/components'

type Props = {
  children: React.ReactNode
  showMenu?: boolean
}

const Layout = ({ children, showMenu = true }: Props) => (
  <Container>
    <Grid columns={1} container padded relaxed>
      {showMenu && (
        <Grid.Column>
          <Segment>
            <TopMenu />
          </Segment>
        </Grid.Column>
      )}

      <Grid.Column>
        <Segment>{children}</Segment>
      </Grid.Column>

      <Grid.Column textAlign="center">
        <Footer />
      </Grid.Column>
    </Grid>
  </Container>
)

export default Layout
