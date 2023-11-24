import { PrismaAdapter } from '@next-auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'
import type { Provider } from 'next-auth/providers'

const providers: Provider[] = []

if (process.env.GITHUB_CLIENT_ID) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  )
}

providers.push(
  EmailProvider({
    server: {
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM,
  })
)

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database', // Store sessions in the database and store a sessionToken in the cookie for lookups
    maxAge: 30 * 24 * 60 * 60, // 30 days to session expiry
    updateAge: 24 * 60 * 60, // 24 hours to update session data into database
  },
  providers: providers,
  callbacks: {
    async session({ session, user }) {
      // FIXME: For some reasons two requests occurred here.
      // We need to fix this behavior somehow.
      const databaseUser = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
      })

      if (!databaseUser) {
        throw new Error('Unable to find the user')
      }

      session.userId = user.id
      session.username = databaseUser.username
      session.displayName = databaseUser.name || databaseUser.username
      session.avatar = databaseUser.image

      return session
    },
  },
}
