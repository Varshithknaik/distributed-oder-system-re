import dotenv from 'dotenv'
import path from 'path'
import { defineConfig, env } from 'prisma/config'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    quiet: true,
    path: path.resolve(process.cwd(), '.env.local'),
  })
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('INVENTORY_DB_URL'),
  },
})
