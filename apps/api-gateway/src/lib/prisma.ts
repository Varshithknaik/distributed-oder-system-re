import * as dotenv from 'dotenv'
import path from 'path'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import { PrismaClient } from '@prisma/client-api-gateway'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    quiet: true,
    path: path.resolve(process.cwd(), '.env.local'),
  })
}

function resolvePath(p: string) {
  // if running in docker -> path exists like mentioned in env file
  if (fs.existsSync(p)) return p

  return p?.replace('/app', '.')
}

const caPath = resolvePath(process.env.POSTGRES_CA!)
const connectionString = `${process.env.USERS_DB_URL}`
const adapter = new PrismaPg({
  connectionString,
  ssl: { ca: fs.readFileSync(caPath, 'utf-8'), rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter })
export { prisma }
