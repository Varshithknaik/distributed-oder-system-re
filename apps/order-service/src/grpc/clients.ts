import grpc from '@grpc/grpc-js'
import {
  InventoryServiceClient,
  PromisifyGrpc,
  ReserveStockRequest,
  ReserveStockResponse,
} from '@core/proto'

const credentials = grpc.credentials.createInsecure()
const inventoryServiceAddress =
  process.env.INVENTORY_SERVICE_ADDRESS || 'localhost:50052'

export const inventoryClient = new InventoryServiceClient(
  inventoryServiceAddress,
  credentials
)

export const reserveStock = PromisifyGrpc<
  ReserveStockRequest,
  ReserveStockResponse
>(inventoryClient.reserveStock.bind(inventoryClient))
