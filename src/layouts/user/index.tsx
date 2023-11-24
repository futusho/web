import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'
import React from 'react'
import {
  Menu,
  Button,
  Container,
  Grid,
  Segment,
  Image,
  Header,
} from 'semantic-ui-react'
import { Footer, Menu as TopMenu } from '@/layouts/shared/components'
import { buildSellerShowcaseURL } from '@/lib/routes'

type Props = {
  children: React.ReactNode
}

const Layout = ({ children }: Props) => {
  const router = useRouter()
  const { data: session } = useSession()

  const avatar =
    session && session.avatar ? session.avatar : '/avatar-placeholder.png'

  return (
    <Container>
      <Grid columns={2} stackable>
        <Grid.Column width={16}>
          <Segment>
            <TopMenu />
          </Segment>
        </Grid.Column>

        <Grid.Column width={4}>
          {session && (
            <Segment textAlign="center">
              <Link href={buildSellerShowcaseURL(session.username)}>
                <Image
                  circular
                  src={avatar}
                  width="100"
                  height="100"
                  alt="Avatar"
                  title="Avatar"
                  centered
                />
              </Link>

              <Header as="h4">
                <Link href={buildSellerShowcaseURL(session.username)}>
                  Signed in as {session.username}
                </Link>
              </Header>

              <Button secondary content="Sign Out" onClick={() => signOut()} />
            </Segment>
          )}

          <Menu pointing vertical size="huge" fluid>
            <Menu.Item>
              <Menu.Header content="Products" />

              <Menu.Menu>
                <Menu.Item
                  icon="block layout"
                  content="Marketplaces"
                  as="a"
                  href="/my/marketplaces"
                  active={router.asPath.startsWith('/my/marketplaces')}
                />

                <Menu.Item
                  icon="box"
                  content="Products"
                  as="a"
                  href="/my/products"
                  active={router.asPath.startsWith('/my/products')}
                />

                <Menu.Item
                  icon="line chart"
                  content="Sales"
                  as="a"
                  href="/my/sales"
                  active={router.asPath.startsWith('/my/sales')}
                />

                <Menu.Item
                  icon="dollar"
                  content="Payouts"
                  as="a"
                  href="/my/payouts"
                  active={router.asPath.startsWith('/my/payouts')}
                />

                <Menu.Item
                  icon="users"
                  content="Audience"
                  as="a"
                  href="#"
                  disabled
                  active={router.asPath.startsWith('/my/audience')}
                />
              </Menu.Menu>
            </Menu.Item>

            <Menu.Item>
              <Menu.Header content="Freelance" />

              <Menu.Menu>
                <Menu.Item
                  icon="cogs"
                  content="Services"
                  as="a"
                  href="#"
                  disabled
                  active={router.asPath.startsWith('/my/services')}
                />

                <Menu.Item
                  icon="users"
                  content="Customers"
                  as="a"
                  href="#"
                  disabled
                  active={router.asPath.startsWith('/my/freelance/customers')}
                />
              </Menu.Menu>
            </Menu.Item>

            <Menu.Item>
              <Menu.Header content="Buyer" />

              <Menu.Menu>
                <Menu.Item
                  icon="clipboard check"
                  content="Orders"
                  as="a"
                  href="/my/orders"
                  active={router.asPath.startsWith('/my/orders')}
                />
              </Menu.Menu>
            </Menu.Item>

            <Menu.Item>
              <Menu.Header content="Account" />

              <Menu.Menu>
                <Menu.Item
                  icon="user"
                  content="Settings"
                  as="a"
                  href="/my/settings"
                  active={router.asPath.startsWith('/my/settings')}
                />
              </Menu.Menu>
            </Menu.Item>
          </Menu>
        </Grid.Column>

        <Grid.Column width={12}>
          <Segment padded>{children}</Segment>
        </Grid.Column>

        <Grid.Column width={16} textAlign="center">
          <Footer />
        </Grid.Column>
      </Grid>
    </Container>
  )
}

export default Layout
