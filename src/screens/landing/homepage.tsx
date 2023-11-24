import React from 'react'
import {
  Popup,
  Container,
  Button,
  Grid,
  Header,
  List,
  Image,
  Divider,
} from 'semantic-ui-react'
import { MainLayout } from '@/layouts'

const Screen = () => (
  <MainLayout>
    <Grid container columns={1} stackable relaxed padded>
      <Grid.Column textAlign="center">
        <Header as="h1" content="Welcome to FutúSho!" />
      </Grid.Column>

      <Grid.Column textAlign="center">
        <List divided horizontal size="huge">
          <Popup
            content="You don't need banks for your transactions. We support and use only cryptocurrencies on our marketplace."
            key="no-banks"
            header="No Banks?"
            wide
            inverted
            trigger={<List.Item as="a">No Banks</List.Item>}
          />

          <Popup
            content="Say goodbye to complex paperwork. Just create an account and enjoy your journey!"
            key="no-paperwork"
            header="No Paperwork?"
            wide
            inverted
            trigger={<List.Item as="a">No Paperwork</List.Item>}
          />

          <Popup
            content="Connect directly with others, no go-betweens."
            key="no-middlemen"
            header="No Middlemen?"
            wide
            inverted
            trigger={<List.Item as="a">No Middlemen</List.Item>}
          />

          <Popup
            content="Our technology makes transactions safe and efficient."
            key="powered-by-blockchain"
            header="Powered by Blockchain?"
            wide
            inverted
            trigger={<List.Item as="a">Powered by Blockchain</List.Item>}
          />
        </List>
      </Grid.Column>

      <Grid.Column>
        <Container text textAlign="justified">
          <Image
            floated="left"
            src="/mascot.png"
            rounded
            width="200"
            height="200"
            alt="FutúSho"
            title="Welcome to FutúSho"
          />

          <p>
            How to sell your digital products and get paid in 5 minutes? How to
            offer your services without traditional banking systems? How to get
            hired and be sure nobody can steal your money? We have an answer!
          </p>

          <p>
            What is FutúSho? It&apos;s a vibrant marketplace that celebrates the
            brilliance of freelancers, digital creators, artists, and digital
            nomads.
          </p>

          <p>
            People and institutions who don&apos;t know or trust each other can
            now interact over the Internet without the need for trusted third
            parties like banks or centralized authorities.
          </p>
        </Container>
      </Grid.Column>

      <Grid.Column textAlign="center">
        <Header as="h3">
          Explore, connect, and be inspired on a transformative journey within
          the heart of digital excellence!
        </Header>

        <Divider />

        <Divider hidden />

        <Button
          size="huge"
          primary
          as="a"
          href="/products"
          content="Explore Our Products!"
        />
      </Grid.Column>
    </Grid>
  </MainLayout>
)

export default Screen
