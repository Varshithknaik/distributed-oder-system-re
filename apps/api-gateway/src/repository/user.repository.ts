import { prisma } from '../lib/prisma.js'

const getUser = async (email: string) => {
  return await prisma.users.findUnique({ where: { email } })
}

const createUser = async (email: string, name: string) => {
  return await prisma.users.create({ data: { email, name } })
}

export { getUser, createUser }
