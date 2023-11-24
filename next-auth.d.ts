import 'next-auth'

declare module 'next-auth' {
  interface Session {
    userId: string
    username: string
    displayName: string
    avatar: string | null
  }
}
