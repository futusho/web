// NOTE: Used in seller showcase
export interface SellerCard {
  displayName: string
  coverImageURL: string | null
  avatarImageURL: string | null
  bio: string | null
  profileURL: string
}

// NOTE: Used in seller showcase
export interface ProductItem {
  id: string
  title: string
  thumbnailImageURL: string | null
  priceFormatted: string
  productPageURL: string
}

interface ProductAttribute {
  key: string
  value: string
}

// NOTE: Used in product card
export interface ProductDetails {
  id: string
  title: string
  description: string | null
  priceFormatted: string
  networkTitle: string
  covers: string[]
  attributes: ProductAttribute[]
}

// NOTE: Used in product card
export interface SellerDetails {
  displayName: string
  profileURL: string
  avatarURL: string
}
