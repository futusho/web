import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Message, Button, Grid, Form } from 'semantic-ui-react'
import { z } from 'zod'
import type { SubmitHandler } from 'react-hook-form'

const validationSchema = z.object({
  email: z.string().email(),
})

export type ValidationSchema = z.infer<typeof validationSchema>

type Props = {
  onFormSubmitted(_data: ValidationSchema): void
  signInError: string
  signInValidationErrors: string[]
  isFormSubmitting: boolean
}

const Component = ({
  onFormSubmitted,
  signInError,
  signInValidationErrors,
  isFormSubmitting,
}: Props) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ValidationSchema>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit: SubmitHandler<ValidationSchema> = (data) => {
    onFormSubmitted(data)
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} size="large">
      <Grid stackable columns={1}>
        <Grid.Column>
          <p>
            Enter your email below to create a new account (or to sign in into
            existing one) and receive a magic link.
          </p>

          {signInError && (
            <Message error>
              <Message.Header content="Unable to sign in" />
              <p>{signInError}</p>
            </Message>
          )}

          {signInValidationErrors.length > 0 && (
            <Message
              error
              header="Validation errors"
              list={signInValidationErrors}
            />
          )}

          <Controller
            name="email"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Form.Input
                {...field}
                error={errors.email && errors.email?.message}
                placeholder="me@domain.tld"
                autoComplete="email"
                maxLength={100}
              />
            )}
          />
        </Grid.Column>

        <Grid.Column>
          <Button
            size="large"
            primary
            content="Continue"
            loading={isSubmitting || isFormSubmitting}
            disabled={isSubmitting || isFormSubmitting || !isValid}
          />
        </Grid.Column>
      </Grid>
    </Form>
  )
}

export default Component
