import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client-inventory-service'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    quiet: true,
    path: path.resolve(process.cwd(), '.env.local'),
  })
}

function resolvePath(p: string) {
  if (fs.existsSync(p)) return p
  return p?.replace('/app', '.')
}

function createPrismaClient() {
  const caPath = resolvePath(process.env.POSTGRES_CA!)
  const connectionString = `${process.env.INVENTORY_DB_URL}`

  const adapter = new PrismaPg({
    connectionString,
    ssl: { ca: fs.readFileSync(caPath, 'utf-8'), rejectUnauthorized: false },
  })

  return new PrismaClient({
    adapter,
  })
}

const globalForPrisma = globalThis as unknown as {
  inventoryServicePrisma?: PrismaClient
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalForPrisma.inventoryServicePrisma ?? createPrismaClient())

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.inventoryServicePrisma = prisma
}
