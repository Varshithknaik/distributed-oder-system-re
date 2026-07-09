import {
  CreateOrderRequest,
  CreateOrderResponse,
  OrderServiceServer,
} from '@core/proto'
import { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js'
import { cancelOrderSchema, createOrderSchema } from '../schema/order.schema.js'
import { cancelOrder, createOrder } from '../domain/order.service.js'
import { toGrpcError } from '../lib/grpc-error.js'

export const orderService: OrderServiceServer = {
  createOrder: async (
    call: ServerUnaryCall<CreateOrderRequest, CreateOrderResponse>,
    callback: sendUnaryData<CreateOrderResponse>
  ) => {
    try {
      const payload = createOrderSchema.safeParse(call.request)
      if (!payload.success) {
        return callback(payload.error, null as never)
      }

      const response = await createOrder(payload.data)
      callback(null, response)
    } catch (error) {
      const grpcError = toGrpcError(error)
      callback(grpcError, null as never)
    }
  },
  cancelOrder: async (call, callback) => {
    try {
      const payload = cancelOrderSchema.safeParse(call.request)
      if (!payload.success) {
        return callback(payload.error, null as never)
      }

      const cancelResponse = await cancelOrder(payload.data)

      const response = {
        status: cancelResponse.status,
        orderId: cancelResponse.orderId,
      }
      callback(null, response)
    } catch (error) {
      const grpcError = toGrpcError(error)
      callback(grpcError, null as never)
    }
  },
}
