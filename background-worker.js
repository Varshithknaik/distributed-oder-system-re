import dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' })
}

async function start() {
  // Dynamically import dependencies AFTER dotenv loads, to prevent env.js from crashing during ESM parsing
  const { connectMongo, disconnectMongo } =
    await import('./apps/read-service/dist/lib/mongo.js')
  const { startOrderConsumer: startReadServiceOrderConsumer } =
    await import('./apps/read-service/dist/events/consumers/order.consumer.js')
  const { startInventoryConsumer: startReadServiceInventoryConsumer } =
    await import('./apps/read-service/dist/events/consumers/inventory.consumer.js')
  const { startOrderConsumer: startInventoryServiceOrderConsumer } =
    await import('./apps/inventory-service/dist/events/consumers/order.consumer.js')
  const { startUserConsumer: startOrderServiceUserConsumer } =
    await import('./apps/order-service/dist/events/consumers/user.consumer.js')
  const { startOrderOutboxPoller } =
    await import('./apps/order-service/dist/outbox/order-outbox-poller.js')
  const { startInventoryOutboxPoller } =
    await import('./apps/inventory-service/dist/outbox/inventory-outbox-poller.js')

  // Read Service
  await connectMongo()
  const { shutdown: readServiceInventoryConsumerShutdown } =
    await startReadServiceInventoryConsumer()
  const { shutdown: readServiceOrderConsumerShutdown } =
    await startReadServiceOrderConsumer()
  const { shutdown: inventoryServiceOrderConsumerShutdown } =
    await startInventoryServiceOrderConsumer()
  const { shutdown: orderConsumerShutdown } =
    await startOrderServiceUserConsumer()

  // 3. Start Outbox Pollers (these return a synchronous stop function)
  const stopOrderOutbox = await startOrderOutboxPoller()
  const stopInventoryOutbox = await startInventoryOutboxPoller()

  return [
    readServiceInventoryConsumerShutdown,
    readServiceOrderConsumerShutdown,
    inventoryServiceOrderConsumerShutdown,
    orderConsumerShutdown,
    disconnectMongo,
    async () => stopOrderOutbox(),
    async () => stopInventoryOutbox(),
  ]
}

let shutdownTasks = []
let isShuttingDown = false

start()
  .then((tasks) => {
    shutdownTasks = tasks
  })
  .catch((err) => {
    console.error('[BACKGROUND WORKER] Failed to start:', err)
    process.exit(1)
  })

async function shutdown() {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log('[BACKGROUND WORKER] Starting shutdown...')

  for (const task of shutdownTasks) {
    try {
      await task()
    } catch (err) {
      console.error('[BACKGROUND WORKER] Error during shutdown:', err)
    }
  }

  console.log('[BACKGROUND WORKER] Cleaned up resources.')
}

process.on('SIGINT', () => shutdown())
process.on('SIGTERM', () => shutdown())
