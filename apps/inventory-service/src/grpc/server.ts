import grpc from '@grpc/grpc-js'
import { InventoryServiceService } from '@core/proto'
import { env } from '../config/env.js'
import { logger } from '@core/logger'
import { InventoryService } from './inventory.handle.js'

const server = new grpc.Server()

server.addService(InventoryServiceService, InventoryService)

export async function startInventoryGrpc() {
  server.bindAsync(
    `${env.grpcHost}:${env.grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.error(`Error starting Inventory Service: ${err}`)
        process.exit(1)
      }
      console.log('Inventory Service is running in port', port)
      logger.info(`Inventory Service is running on port ${port}`)
    }
  )

  return {
    shutdown: () => {
      server.forceShutdown()
    },
  }
}
