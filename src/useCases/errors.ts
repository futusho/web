export class ClientError extends Error {}

export class InternalServerError extends Error {}

export class ConflictError extends ClientError {}

export class UseCaseValidationError extends ClientError {
  errors: string[]

  constructor(errors: string[]) {
    super()
    this.errors = errors
  }
}
