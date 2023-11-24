import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Segment, Button, Header, Grid, Form } from 'semantic-ui-react'
import { z } from 'zod'
import type { Profile } from '@/types/user-settings'
import type { SubmitHandler } from 'react-hook-form'

const validationSchema = z.object({
  username: z.string().trim().min(1).max(30),
  displayName: z.string().trim().min(1),
  bio: z.string().trim(),
})

export type ValidationSchema = z.infer<typeof validationSchema>

type Props = {
  profile: Profile
  onFormSubmitted(_data: ValidationSchema): void
}

const Component = ({ profile, onFormSubmitted }: Props) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ValidationSchema>({
    mode: 'onChange',
    resolver: zodResolver(validationSchema),
    defaultValues: {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
    },
  })

  const onSubmit: SubmitHandler<ValidationSchema> = (data) => {
    onFormSubmitted(data)
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Grid stackable columns={1}>
        <Grid.Column>
          <Segment>
            <Header as="h3" content="Username" />

            <p>Your username is unique and helps others find you.</p>

            <p>
              It&apos;s part of your seller-specific URL for showcasing products
              and services. Changing your username also changes your URL, so
              choose wisely. Update links and promotional material accordingly.
            </p>

            <Controller
              name="username"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Form.Input
                  {...field}
                  error={errors.username && errors.username?.message}
                  placeholder=""
                  autoComplete="off"
                  maxLength={30}
                />
              )}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Segment>
            <Header as="h3" content="Display name" />

            <p>
              This is the name that will be shown to other users on our
              platform.
            </p>

            <p>
              It&apos;s the way you&apos;ll be recognized and identified within
              the community. Your display name is your virtual identity, so
              choose it carefully to reflect your persona and brand effectively.
            </p>

            <Controller
              name="displayName"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Form.Input
                  {...field}
                  error={errors.displayName && errors.displayName?.message}
                  placeholder=""
                  autoComplete="off"
                  maxLength={30}
                />
              )}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Segment>
            <Header as="h3" content="A few words about yourself" />

            <p>This is your chance to introduce yourself briefly.</p>

            <p>
              Your bio, prominently displayed on your profile, provides insight
              into your background, expertise, or interests. Craft it engagingly
              and concisely to leave a positive impression on potential buyers
              and community members.
            </p>

            <Controller
              name="bio"
              control={control}
              render={({ field }) => (
                <Form.TextArea
                  {...field}
                  error={errors.bio && errors.bio?.message}
                  placeholder=""
                  rows={6}
                />
              )}
            />
          </Segment>
        </Grid.Column>

        <Grid.Column>
          <Button
            positive
            size="large"
            content="Update"
            disabled={isSubmitting || !isValid}
          />
        </Grid.Column>
      </Grid>
    </Form>
  )
}

export default Component
