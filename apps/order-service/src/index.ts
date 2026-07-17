import './config/env.js'
import { startOrderGrpc } from './grpc/server.js'

const { shutdown } = await startOrderGrpc()

process.on('SIGINT', () => {
  shutdown()
})
process.on('SIGTERM', () => {
  shutdown()
})
