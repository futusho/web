// TODO: I don't like that transformer is placed inside validations.ts file.
// Maybe it would be good to move this function to a specific file.
export const transformZodError = (
  errors: Record<string, string[]>
): string[] => {
  const transformedErrors: string[] = []

  for (const fieldName in errors) {
    const e = errors[fieldName]

    e.forEach((error) => {
      transformedErrors.push(`${fieldName}: ${error}`)
    })
  }

  return transformedErrors
}
