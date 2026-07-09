import grpc from '@grpc/grpc-js'
import { InventoryServiceClient, OrderServiceClient } from '@core/proto'

const credentials = grpc.credentials.createInsecure()
const orderServiceAddress = 'localhost:50051'
const inventoryServiceAddress = 'localhost:50052'

export const orderClient = new OrderServiceClient(
  orderServiceAddress,
  credentials
)

export const inventoryClient = new InventoryServiceClient(
  inventoryServiceAddress,
  credentials
)
