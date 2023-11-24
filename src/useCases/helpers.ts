import { prisma } from '@/lib/prisma'

export const isUserExists = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  })

  return user !== null
}
