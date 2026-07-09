import './config/env.js'
import { startOrderGrpc } from './grpc/server.js'
import { startOrderOutboxPoller } from './outbox/order-outbox-poller.js'

const { shutdown } = await startOrderGrpc()
const stopOutboxPoller = await startOrderOutboxPoller()

process.on('SIGINT', () => {
  shutdown()
  stopOutboxPoller()
})
process.on('SIGTERM', () => {
  shutdown()
  stopOutboxPoller()
})
