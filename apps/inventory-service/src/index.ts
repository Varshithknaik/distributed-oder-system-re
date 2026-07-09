import './config/env.js'
import { startOrderConsumer } from './events/consumers/order.consumer.js'
import { startInventoryGrpc } from './grpc/server.js'
import { startInventoryOutboxPoller } from './outbox/inventory-outbox-poller.js'

const { shutdown } = await startInventoryGrpc()
const { shutdown: orderConsumerShutdown } = await startOrderConsumer()
const stopOutboxPoller = await startInventoryOutboxPoller()

process.on('SIGINT', () => {
  shutdown()
  stopOutboxPoller()
  orderConsumerShutdown()
})
process.on('SIGTERM', () => {
  shutdown()
  stopOutboxPoller()
  orderConsumerShutdown()
})
