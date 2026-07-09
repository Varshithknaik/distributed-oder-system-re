import { Router, Request, Response } from 'express'
import { orderClient } from '../../grpcClients.js'
import {
  CancelOrderRequest,
  CreateOrderRequest,
  CreateOrderResponse,
} from '@core/proto'
import { ServiceError } from '@grpc/grpc-js'
import { sendError, sendSuccess } from '../../lib/http-response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { createOrderSchema } from '../../schema/order.schema.js'

export const orderRouter = Router()

orderRouter.post('/', authMiddleware, (req: Request, res: Response) => {
  const payload = createOrderSchema.safeParse(req.body)

  if (!payload.success) {
    return sendError(res, 400, 'Invalid payload', payload.error)
  }

  const request: CreateOrderRequest = {
    userId: req.user!.id,
    items: payload.data.items,
  }

  orderClient.createOrder(
    request,
    (err: ServiceError | null, response: CreateOrderResponse) => {
      if (err) {
        return sendError(res, 500, 'Failed to create order', err.message)
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
    const orderId = req.params.orderId

    if (Array.isArray(orderId)) {
      return sendError(
        res,
        400,
        'Invalid payload',
        'Order ID cannot be an array'
      )
    }

    const request: CancelOrderRequest = {
      orderId,
      message: 'USER_REQUESTED',
    }

    orderClient.cancelOrder(request, (err, response) => {
      if (err) {
        return sendError(res, 500, 'Failed to cancel order', err.message)
      } else {
        return sendSuccess(res, 200, 'Order cancelled successfully', response)
      }
    })
  }
)
