import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client-order-service'

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
  const connectionString = `${process.env.ORDER_DB_URL}`

  const pool = new Pool({
    connectionString,
    max: 5, // Limit to 3 connections to prevent P2037
    ssl: { ca: fs.readFileSync(caPath, 'utf-8'), rejectUnauthorized: false },
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  orderServicePrisma?: PrismaClient
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalForPrisma.orderServicePrisma ?? createPrismaClient())

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.orderServicePrisma = prisma
}
