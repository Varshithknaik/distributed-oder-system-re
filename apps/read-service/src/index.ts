import dotenv from 'dotenv'
import { startInventoryConsumer } from './events/consumers/inventory.consumer.js'
import { connectMongo, disconnectMongo } from './lib/mongo.js'
import { startOrderConsumer } from './events/consumers/order.consumer.js'
import { logger } from '@core/logger'

dotenv.config({ quiet: true })

type ShutdownFn = () => Promise<void>

const start = async () => {
  await connectMongo()
  const { shutdown: inventoryConsumerShutdown } = await startInventoryConsumer()
  const { shutdown: orderConsumerShutdown } = await startOrderConsumer()
  return [inventoryConsumerShutdown, orderConsumerShutdown, disconnectMongo]
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

process.once('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
