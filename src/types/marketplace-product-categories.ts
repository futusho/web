export interface ProductCategoryItem {
  id: string
  productCategoryURL: string
  title: string
  description: string
}

export interface ProductCategoryDetails {
  id: string
  slug: string
  title: string
  description: string
}

export interface ProductItem {
  id: string
  title: string
  thumbnailImageURL: string | null
  priceFormatted: string
  productPageURL: string
  sellerAvatarURL: string
  sellerDisplayName: string
}
