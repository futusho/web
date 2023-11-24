import React from 'react'
import { Header } from 'semantic-ui-react'
import type { DraftOrderERC20, PendingOrderERC20 } from '@/types/user-orders'

interface Props {
  order: DraftOrderERC20 | PendingOrderERC20
}

export const InsufficientFunds = ({ order }: Props) => (
  <>
    <Header
      as="h3"
      content="Step 4 of 7: You don't have enough funds"
      color="red"
    />

    <p>
      We&apos;re sorry to let you know that you currently don&apos;t have enough
      funds in your wallet to make a purchase on our marketplace. We understand
      that this may be disappointing, and we apologize for any inconvenience
      caused.
    </p>

    <p>
      To buy products from our sellers, you&apos;ll need to have a sufficient
      balance of tokens ({order.priceFormatted}) in your wallet. Adding more
      tokens will allow you to complete your desired purchase and enjoy the
      offerings of our marketplace.
    </p>
  </>
)
