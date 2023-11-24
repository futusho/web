import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import {
  ClientError,
  ConflictError,
  UseCaseValidationError,
} from '@/useCases/errors'
import {
  FORBIDDEN_USERNAMES,
  updateUserProfileSettings,
  UserDoesNotExist,
  UsernameIsAlreadyTaken,
  UsernameIsForbidden,
} from '@/useCases/updateUserProfileSettings'
import { cleanDatabase } from '../helpers'
import type { User } from '@prisma/client'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe('updateUserProfileSettings', () => {
  const request = {
    userId: uuidv4(),
    displayName: 'display name',
    username: 'new_username',
    bio: '',
  }

  describe('when userId is not a valid uuid', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProfileSettings({
          ...request,
          userId: 'not-an-uuid',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'userId: Invalid uuid',
        ])
      }
    })
  })

  describe('when username is too short', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProfileSettings({
          ...request,
          username: '   ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'username: String must contain at least 3 character(s)',
        ])
      }
    })
  })

  describe('when username is too long', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProfileSettings({
          ...request,
          username: 'ABCDEFGHIJKLMNOPRSTQRSTUVWXYZ12',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'username: String must contain at most 30 character(s)',
        ])
      }
    })
  })

  describe('when username is not started with letter', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProfileSettings({
          ...request,
          username: '0abcdefghijklmnoprstqrstuvwxyz',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'username: Invalid username format',
        ])
      }
    })
  })

  describe('when display name is empty', () => {
    it('returns error', async () => {
      expect.assertions(2)

      try {
        await updateUserProfileSettings({
          ...request,
          displayName: ' ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(UseCaseValidationError)
        expect((e as UseCaseValidationError).errors).toEqual([
          'displayName: String must contain at least 1 character(s)',
        ])
      }
    })
  })

  FORBIDDEN_USERNAMES.forEach((forbiddenUsername) => {
    describe(`when username ${forbiddenUsername} is forbidden`, () => {
      it('returns error', async () => {
        expect.assertions(3)

        try {
          await updateUserProfileSettings({
            ...request,
            username: ` ${forbiddenUsername.toUpperCase()} `,
          })
        } catch (e) {
          expect(e).toBeInstanceOf(ConflictError)
          expect(e).toBeInstanceOf(UsernameIsForbidden)
          expect((e as UsernameIsForbidden).message).toEqual(
            'Username is forbidden'
          )
        }
      })
    })
  })

  describe('when user does not exist', () => {
    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProfileSettings({
          ...request,
          userId: uuidv4(),
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UserDoesNotExist)
        expect((e as UserDoesNotExist).message).toEqual('User does not exist')
      }
    })
  })

  describe('when username is already taken', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'me@domain.tld',
        },
      })

      await prisma.user.create({
        data: {
          email: 'me2@domain.tld',
          username: 'username2',
        },
      })
    })

    it('returns error', async () => {
      expect.assertions(3)

      try {
        await updateUserProfileSettings({
          ...request,
          userId: user.id,
          username: ' USERNAME2 ',
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ClientError)
        expect(e).toBeInstanceOf(UsernameIsAlreadyTaken)
        expect((e as UsernameIsAlreadyTaken).message).toEqual(
          'Username is already taken'
        )
      }
    })
  })

  describe('when everything is good', () => {
    let user: User

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'me@domain.tld',
          username: 'username',
          name: 'name',
          bio: 'bio',
        },
      })
    })

    it('updates user attributes', async () => {
      await updateUserProfileSettings({
        userId: user.id,
        username: ' USERNAME2 ',
        displayName: ' New Name ',
        bio: ' My New BIO ',
      })

      const updatedUser = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
      })

      if (!updatedUser) {
        throw new Error('Unable to get user')
      }

      expect(updatedUser.email).toEqual('me@domain.tld')
      expect(updatedUser.username).toEqual('username2')
      expect(updatedUser.name).toEqual('New Name')
      expect(updatedUser.bio).toEqual('My New BIO')
      expect(updatedUser.image).toBeNull()
    })
  })
})
