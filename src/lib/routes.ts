// TODO: Rename to buildSellerURL
export const buildSellerShowcaseURL = (sellerUsername: string): string =>
  `/u/${sellerUsername}`

export const buildProductPageURL = (
  sellerUsername: string,
  productSlug: string
): string => `/u/${sellerUsername}/${productSlug}`
