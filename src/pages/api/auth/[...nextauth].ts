import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// @see src/lib/auth.ts
export default NextAuth(authOptions)
