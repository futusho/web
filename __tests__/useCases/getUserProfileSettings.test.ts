import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  InternalServerError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  getUserProfileSettings,
  UserDoesNotExist,
  UserDoesNotHaveEmail,
} from '@/useCases/getUserProfileSettings'
import { cleanDatabase } from '../helpers'
import type { User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('getUserProfileSettings', () => {
  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        const result = await getUserProfileSettings({
          userId: 'test',
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userId: Invalid uuid',
        ])
      }
    })
  })

  describe('when userId does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProfileSettings({
          userId: uuidv4(),
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserDoesNotExist)
        expect((e as UserDoesNotExist).message).toEqual('User does not exist')
      }
    })
  })

  describe('when user does not have email', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {},
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        const result = await getUserProfileSettings({
          userId: user.id,
        })

        expect(result).toBeNull()
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerError)
        expect(e).toBeInstanceOf(UserDoesNotHaveEmail)
        expect((e as UserDoesNotHaveEmail).message).toEqual(
          'User does not have email'
        )
      }
    })
  })

  describe('when everything is good', () => {
    describe('when user does not have any fields', () => {
      let user: User

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            email: 'me@domain.tld',
          },
        })
      })

      it('returns default values', async () => {
        const profile = await getUserProfileSettings({
          userId: user.id,
        })

        expect(profile.email).toEqual('me@domain.tld')
        expect(profile.username).toEqual(user.username)
        expect(profile.displayName).toEqual(user.username)
        expect(profile.bio).toEqual('')
        expect(profile.avatarURL).toEqual('')
        expect(profile.coverImageURL).toEqual('')
      })
    })

    describe('when profile is filled', () => {
      let user: User

      beforeEach(async () => {
        user = await prisma.user.create({
          data: {
            email: 'me@domain.tld',
            name: 'User',
            username: 'username',
            bio: 'BIO',
            image: 'http://localhost:3000/public/image.png',
          },
        })
      })

      it('returns profile', async () => {
        const profile = await getUserProfileSettings({
          userId: user.id,
        })

        expect(profile.email).toEqual('me@domain.tld')
        expect(profile.username).toEqual('username')
        expect(profile.displayName).toEqual('User')
        expect(profile.bio).toEqual('BIO')
        expect(profile.avatarURL).toEqual(
          'http://localhost:3000/public/image.png'
        )
        expect(profile.coverImageURL).toEqual('')
      })
    })

    describe('when user has attached cover image', () => {
      it.todo('returns cover image')
    })
  })
})
