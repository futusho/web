// TODO: Rename to reduceBlockchainAddress
export const reduceWalletAddress = (
  walletAddress: string,
  prefixLength = 10,
  suffixLength = 6
): string => {
  if (walletAddress.length <= prefixLength + suffixLength) {
    return walletAddress
  }

  const prefix = walletAddress.slice(0, prefixLength)
  const suffix = walletAddress.slice(-suffixLength)

  return `${prefix}...${suffix}`
}

export const reduceTransactionHash = (
  transactionHash: string,
  prefixLength = 15,
  suffixLength = 15
): string => {
  if (transactionHash.length <= prefixLength + suffixLength) {
    return transactionHash
  }

  const prefix = transactionHash.slice(0, prefixLength)
  const suffix = transactionHash.slice(-suffixLength)

  return `${prefix}...${suffix}`
}

export const formatBalance = (balance: string, symbol: string) =>
  `${parseFloat(balance).toFixed(4)} ${symbol}`
