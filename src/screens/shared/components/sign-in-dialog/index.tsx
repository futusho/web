import { signIn } from 'next-auth/react'
import React, { useState } from 'react'
import { Message, Modal, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { APIError } from '@/lib/api'
import SignInForm from '../sign-in-form'
import type { ValidationSchema as SignInFormSchema } from '../sign-in-form'

type Props = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  open: boolean
}

const Component = ({ setOpen, open }: Props) => {
  const [signInError, setSignInError] = useState<string>('')
  const [signInValidationErrors, setSignInValidationErrors] = useState<
    string[]
  >([])
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false)

  const onFormSubmitted = async (data: SignInFormSchema) => {
    try {
      setFormSubmitting(true)
      setSignInError('')
      setSignInValidationErrors([])

      const response = await signIn('email', {
        email: data.email,
      })

      if (response?.error) {
        throw new Error(response.error)
      }
    } catch (e) {
      if (e instanceof APIError) {
        setSignInError(e.message)
        setSignInValidationErrors(e.validationErrors)
      } else {
        setSignInError(`${e}`)
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
      size="tiny"
    >
      <Header icon="sign-in" content="Sign In or Create Account" />

      <Modal.Content>
        {signInError && (
          <ErrorMessage header="Unable to sign in" content={signInError} />
        )}

        {signInValidationErrors.length > 0 && (
          <Message
            error
            header="Validation errors"
            list={signInValidationErrors}
          />
        )}

        <SignInForm
          onFormSubmitted={(data: SignInFormSchema) => onFormSubmitted(data)}
          signInError={signInError}
          signInValidationErrors={signInValidationErrors}
          isFormSubmitting={formSubmitting}
        />
      </Modal.Content>
    </Modal>
  )
}

export default Component
