import { Router, Request, Response } from 'express'
import {
  parseGrpcError,
  sendError,
  sendSuccess,
} from '../../lib/http-response.js'
import {
  addInventorySchema,
  updateInventorySchema,
} from '../../schema/inventory.schema.js'
import { inventoryClient } from '../../grpcClients.js'
import { grpcStatusToHttp } from '../../lib/grpc-status-map.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

export const inventoryRouter = Router()

inventoryRouter.post(
  '/products',
  authMiddleware,
  (req: Request, res: Response) => {
    const payload = addInventorySchema.safeParse(req.body)
    if (!payload.success) {
      return sendError(res, 400, 'Invalid payload', payload.error.issues)
    }

    inventoryClient.addInventory(payload.data, (err, resp) => {
      if (err) {
        return sendError(
          res,
          grpcStatusToHttp(err.code),
          'Failed to add inventory',
          parseGrpcError(err)
        )
      }
      return sendSuccess(res, 200, 'Inventory added successfully', resp)
    })
  }
)

inventoryRouter.post(
  '/products/bulk',
  authMiddleware,
  (req: Request, res: Response) => {
    const payload = addInventorySchema.array().safeParse(req.body)
    if (!payload.success) {
      return sendError(res, 400, 'Invalid payload', payload.error.issues)
    }

    inventoryClient.bulkAddInventory(
      { products: payload.data },
      (err, resp) => {
        if (err) {
          return sendError(
            res,
            grpcStatusToHttp(err.code),
            'Failed to add inventory',
            parseGrpcError(err)
          )
        }
        return sendSuccess(res, 200, 'Inventory added successfully', resp)
      }
    )
  }
)

inventoryRouter.patch(
  '/products/:sku/',
  authMiddleware,
  (req: Request, res: Response) => {
    const payload = updateInventorySchema.safeParse({
      ...req.params,
      ...req.body,
    })
    if (!payload.success) {
      return sendError(res, 400, 'Invalid payload', payload.error.issues)
    }

    inventoryClient.updateInventory(payload.data, (err, resp) => {
      if (err) {
        return sendError(
          res,
          grpcStatusToHttp(err.code),
          'Failed to update inventory',
          parseGrpcError(err)
        )
      }
      return sendSuccess(res, 200, 'Inventory updated successfully', resp)
    })
  }
)
