import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { Grid, Message, Header } from 'semantic-ui-react'
import { ErrorMessage } from '@/components'
import { UserLayout } from '@/layouts'
import { APIError } from '@/lib/api'
import { settings as SettingsAPI } from '@/lib/api/user/settings'
import type { Profile } from '@/types/user-settings'
import { EditProfileForm } from './components'
import type { ValidationSchema } from './components/edit-profile-form'

interface Props {
  profile: Profile
}

const Screen = ({ profile }: Props) => {
  const router = useRouter()
  const { data: session } = useSession()

  const [updateProfileError, setUpdateProfileError] = useState<string>('')
  const [updateProfileValidationErrors, setUpdateProfileValidationErrors] =
    useState<string[]>([])

  const handleUpdateProfile = async (data: ValidationSchema) => {
    if (!session?.userId) return

    try {
      setUpdateProfileError('')
      setUpdateProfileValidationErrors([])

      const response = await SettingsAPI.updateProfile({
        username: data.username,
        display_name: data.displayName,
        bio: data.bio,
      })

      if (!response.data) {
        throw new Error('There is not data in API response')
      }

      router.reload()
    } catch (e) {
      if (e instanceof APIError) {
        setUpdateProfileError(e.message)
        setUpdateProfileValidationErrors(e.validationErrors)
      } else {
        setUpdateProfileError(`${e}`)
      }
    }
  }

  return (
    <UserLayout>
      <Header as="h1" content="Settings" />

      <Grid stackable columns={1}>
        {updateProfileError && (
          <Grid.Column>
            <ErrorMessage
              header="Unable to update profile"
              content={updateProfileError}
            />
          </Grid.Column>
        )}

        {updateProfileValidationErrors.length > 0 && (
          <Grid.Column>
            <Message
              icon="ban"
              error
              header="Unable to update profile"
              list={updateProfileValidationErrors}
            />
          </Grid.Column>
        )}

        <Grid.Column>
          <EditProfileForm
            profile={profile}
            onFormSubmitted={(data) => handleUpdateProfile(data)}
          />
        </Grid.Column>
      </Grid>
    </UserLayout>
  )
}

export default Screen
