import './config/env.js'
import { startInventoryGrpc } from './grpc/server.js'

const { shutdown } = await startInventoryGrpc()

process.on('SIGINT', () => {
  shutdown()
})
process.on('SIGTERM', () => {
  shutdown()
})
