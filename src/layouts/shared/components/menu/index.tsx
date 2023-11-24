import { useRouter } from 'next/router'
import React from 'react'
import { Menu, Image } from 'semantic-ui-react'
import Logo from '../../../../../public/menu-icon.png'

const Component = () => {
  const router = useRouter()

  return (
    <Menu stackable secondary icon="labeled">
      <Menu.Item as="a" href="/" header>
        <Image
          src={Logo.src}
          width={50}
          height={50}
          verticalAlign="middle"
          rounded
          alt="FutúSho"
        />
      </Menu.Item>

      <Menu.Item
        as="a"
        href="/products"
        content="Products"
        icon="box"
        active={router.asPath.startsWith('/products')}
      />

      <Menu.Menu position="right">
        <Menu.Item
          as="a"
          href="https://futusho.com/discord"
          content="Discord"
          icon="discord"
          target="_blank"
          rel="nofollow noopener noreferrer"
        />

        <Menu.Item
          as="a"
          href="/my"
          content="My Account"
          icon="user"
          active={router.asPath.startsWith('/my')}
        />
      </Menu.Menu>
    </Menu>
  )
}

export default Component
