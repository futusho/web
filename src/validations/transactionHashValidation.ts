function validateTransactionHash(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value)
}

const transactionHashErrorMessage =
  'Must be a hexadecimal value and start with 0x'

export { validateTransactionHash, transactionHashErrorMessage }
