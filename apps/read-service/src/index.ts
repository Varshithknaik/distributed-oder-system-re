import dotenv from 'dotenv'
import { connectMongo, disconnectMongo } from './lib/mongo.js'
import { logger } from '@core/logger'

dotenv.config({ quiet: true })

type ShutdownFn = () => Promise<void>

const start = async () => {
  await connectMongo()
  return [disconnectMongo]
}

const shutdownTasks: ShutdownFn[] = await start()

let isShuttingdown = false

const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingdown) return

  isShuttingdown = true

  logger.info(
    `[READ-SERVICE] Received termination signal: ${signal}, Initiating graceful shutdown...`
  )

  await Promise.allSettled(shutdownTasks.map((task) => task()))

  logger.info(
    `[READ-SERVICE] All tasks completed, process exiting with code: 0`
  )
}

console.log('simple change')

process.once('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
