export interface UserProductDetails {
  id: string
  productCategoryTitle: string
  slug: string
  title: string
  priceFormatted: string
}

export interface UserMarketplaceToken {
  id: string
  displayName: string
}

export interface UserProductItem {
  id: string
  title: string
  priceFormatted: string
  categoryTitle: string
  status: string
}

export interface ProductCategory {
  id: string
  title: string
}

export interface ProductAttribute {
  key: string
  value: string
}

export interface EditableProductDetails {
  id: string
  userMarketplaceTokenId: string
  productCategoryId: string
  slug: string
  title: string
  description: string
  content: string
  price: string
  thumbnailImages: ProductImage[]
  coverImages: ProductImage[]
  attributes: ProductAttribute[]
}

export interface ProductImage {
  id: string
  url: string
}
