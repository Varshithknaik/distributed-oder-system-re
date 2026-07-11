import { Router, Request, Response } from 'express'
import { orderClient } from '../../grpcClients.js'
import {
  CancelOrderRequest,
  CancelOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from '@core/proto'
import { ServiceError } from '@grpc/grpc-js'
import {
  parseGrpcError,
  sendError,
  sendSuccess,
} from '../../lib/http-response.js'
import { grpcStatusToHttp } from '../../lib/grpc-status-map.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import {
  cancelOrderParamsSchema,
  createOrderSchema,
} from '../../schema/order.schema.js'

export const orderRouter = Router()

orderRouter.post('/', authMiddleware, (req: Request, res: Response) => {
  const payload = createOrderSchema.safeParse(req.body)

  if (!payload.success) {
    return sendError(res, 400, 'Invalid payload', payload.error.issues)
  }

  const request: CreateOrderRequest = {
    userId: req.user!.id,
    items: payload.data.items,
  }

  orderClient.createOrder(
    request,
    (err: ServiceError | null, response: CreateOrderResponse) => {
      if (err) {
        return sendError(
          res,
          grpcStatusToHttp(err.code),
          'Failed to create order',
          parseGrpcError(err)
        )
      } else {
        return sendSuccess(res, 200, 'Order created successfully', response)
      }
    }
  )
})

orderRouter.patch(
  '/cancel/:orderId',
  authMiddleware,
  (req: Request, res: Response) => {
    const params = cancelOrderParamsSchema.safeParse(req.params)

    if (!params.success) {
      return sendError(
        res,
        400,
        'Invalid route parameters',
        params.error.issues
      )
    }

    const { orderId } = params.data

    const request: CancelOrderRequest = {
      orderId,
      message: 'USER_REQUESTED',
    }

    orderClient.cancelOrder(
      request,
      (err: ServiceError | null, response: CancelOrderResponse) => {
        if (err) {
          return sendError(
            res,
            grpcStatusToHttp(err.code),
            'Failed to cancel order',
            parseGrpcError(err)
          )
        } else {
          return sendSuccess(res, 200, 'Order cancelled successfully', response)
        }
      }
    )
  }
)
