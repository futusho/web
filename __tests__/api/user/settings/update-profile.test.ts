import { prisma } from '@/lib/prisma'
import { default as handler } from '@/pages/api/user/settings'
import {
  cleanDatabase,
  createUserWithSession,
  mockPUTRequest,
  parseJSON,
} from '../../../helpers'

const ENDPOINT = '/api/user/settings'

beforeEach(async () => {
  await cleanDatabase(prisma)
})

describe(`PUT ${ENDPOINT}`, () => {
  describe('when request is unauthorized', () => {
    it('returns error', async () => {
      const { req, res } = mockPUTRequest({}, '')

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)

      const json = parseJSON(res)

      expect(json).toEqual({
        success: false,
        message: 'Authorization required',
      })
    })
  })

  describe('when request is authorized', () => {
    let sessionToken: string

    beforeEach(async () => {
      const { sessionToken: _sessionToken } = await createUserWithSession({
        email: 'me@domain.tld',
      })

      sessionToken = _sessionToken
    })

    describe('request validations', () => {
      describe('when username is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPUTRequest(
            {
              display_name: '',
              bio: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['username: Required'],
          })
        })
      })

      describe('when display_name is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPUTRequest(
            {
              username: '',
              bio: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['display_name: Required'],
          })
        })
      })

      describe('when bio is missing', () => {
        it('returns error', async () => {
          const { req, res } = mockPUTRequest(
            {
              username: '',
              display_name: '',
            },
            sessionToken
          )

          await handler(req, res)

          expect(res._getStatusCode()).toBe(400)

          const json = parseJSON(res)

          expect(json).toEqual({
            success: false,
            errors: ['bio: Required'],
          })
        })
      })
    })

    describe('when attributes are not valid in terms of useCase', () => {
      it.todo('returns error')
    })

    describe('when everything is great', () => {
      it('returns valid response', async () => {
        const { req, res } = mockPUTRequest(
          {
            username: ' New-Username ',
            display_name: ' New Display Name ',
            bio: ' User BIO ',
          },
          sessionToken
        )

        await handler(req, res)

        expect(res._getStatusCode()).toBe(200)

        const json = parseJSON(res)

        expect(json).toEqual({
          success: true,
          data: {
            username: 'new-username',
            display_name: 'New Display Name',
            bio: 'User BIO',
            email: 'me@domain.tld',
          },
        })
      })
    })
  })
})
