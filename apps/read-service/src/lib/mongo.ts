import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { logger } from '@core/logger'

export async function connectMongo(): Promise<typeof mongoose> {
  const connection = await mongoose.connect(env.mongoURI)
  logger.info(
    `[READ SERVICE] MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
  )
  return connection
}

mongoose.connection.on('disconnected', () => {
  logger.warn('[READ SERVICE] MongoDB disconnected')
})
mongoose.connection.on('reconnected', () => {
  logger.info('[READ SERVICE] MongoDB reconnected')
})
mongoose.connection.on('error', (err) => {
  logger.error('[READ SERVICE] MongoDB error', err)
})

export async function disconnectMongo() {
  await mongoose.disconnect()
  logger.info('[READ SERVICE] MongoDB disconnected gracefully')
}
