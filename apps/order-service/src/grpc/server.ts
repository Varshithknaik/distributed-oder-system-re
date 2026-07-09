import { OrderServiceService } from '@core/proto'
import grpc from '@grpc/grpc-js'
import { logger } from '@core/logger'
import { env } from '../config/env.js'
import { startUserConsumer } from '../events/consumers/user.consumer.js'
import { orderService } from './order.handler.js'

const server = new grpc.Server()

server.addService(OrderServiceService, orderService)

export async function startOrderGrpc() {
  server.bindAsync(
    `${env.grpcHost}:${env.grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.error(err)
        process.exit(1)
      }

      console.log('Order Service is running in port', port)
    }
  )

  const { shutdown: userConsumerShutdown } = await startUserConsumer(false)

  return {
    shutdown: async () => {
      await userConsumerShutdown()
      server.forceShutdown()
    },
  }
}
