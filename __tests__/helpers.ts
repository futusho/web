import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { createMocks } from 'node-mocks-http'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  RequestOptions,
  MockResponse,
  createRequest,
  createResponse,
} from 'node-mocks-http'

export type APIRequest = NextApiRequest & ReturnType<typeof createRequest>
export type APIResponse = NextApiResponse & ReturnType<typeof createResponse>

export const cleanDatabase = async (prisma: PrismaClient) => {
  // NOTE: When we have tables with optional references, we must delete the records on such tables manually,
  // according to this discussion: https://github.com/prisma/prisma/discussions/12866

  const deleteProductCategories = prisma.productCategory.deleteMany()
  const deleteUsers = prisma.user.deleteMany()
  const deleteNetworks = prisma.network.deleteMany()

  await prisma.$transaction([
    deleteProductCategories,
    deleteUsers,
    deleteNetworks,
  ])
}

interface UserIdAndSessionToken {
  userId: string
  sessionToken: string
}

interface CreateUserProps {
  name?: string
  username?: string
  email?: string
}

export const createUserWithSession = async (
  props?: CreateUserProps
): Promise<UserIdAndSessionToken> => {
  const sessionToken = uuidv4()

  const user = await prisma.user.create({
    data: {
      name: props?.name,
      username: props?.username ?? uuidv4(),
      email: props?.email ?? `${sessionToken}@domain.tld`,
      emailVerified: new Date(),
    },
  })

  const adapter = PrismaAdapter(prisma)

  if (!adapter.createSession) {
    throw new Error('PrismaAdapter does not support createSession')
  }

  await adapter.createSession({
    userId: user.id,
    sessionToken: sessionToken,
    expires: new Date('2100-01-01'),
  })

  return {
    userId: user.id,
    sessionToken,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJSON = (res: MockResponse<any>) => JSON.parse(res._getData())

export const mockPOSTRequest = (
  body: RequestOptions['body'] = {},
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'POST',
    body: body,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockPOSTRequestWithQuery = (
  query: RequestOptions['query'],
  body: RequestOptions['body'] = {},
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'POST',
    query: query,
    body: body,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockGETRequest = (sessionToken?: string) =>
  createMocks<APIRequest, APIResponse>({
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockGETRequestWithQuery = (
  query: RequestOptions['query'],
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'GET',
    query: query,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockPUTRequest = (
  body: RequestOptions['body'] = {},
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'PUT',
    body: body,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockPUTRequestWithQuery = (
  query: RequestOptions['query'],
  body: RequestOptions['body'] = {},
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'PUT',
    query: query,
    body: body,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockDELETERequest = (sessionToken?: string) =>
  createMocks<APIRequest, APIResponse>({
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })

export const mockDELETERequestWithQuery = (
  query: RequestOptions['query'],
  sessionToken?: string
) =>
  createMocks<APIRequest, APIResponse>({
    method: 'DELETE',
    query: query,
    headers: {
      'content-type': 'application/json',
    },
    cookies: {
      'next-auth.session-token': sessionToken || '',
    },
  })
