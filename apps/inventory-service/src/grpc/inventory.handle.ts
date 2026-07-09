import { InventoryServiceServer } from 'packages/proto-pack/dist/index.js'
import {
  addInventory,
  bulkAddInventory,
  reserveStock,
  updateInventory,
} from '../reporitory/inventory.repository.js'
import {
  addInventoryDomainSchema,
  bulkAddInventoryDomainSchema,
  checkAvailabilityDomainSchema,
  ReserveStockRequestSchema,
  updateInventoryDomainSchema,
} from '../schema/inventory.schema.js'
import { toGrpcError } from '../lib/grpc-error.js'

export const InventoryService: InventoryServiceServer = {
  async addInventory(call, callback) {
    try {
      const payload = addInventoryDomainSchema.safeParse(call.request)

      if (!payload.success) {
        return callback(payload.error, null)
      }
      const response = await addInventory(payload.data)

      callback(null, {
        sku: response.sku,
      })
    } catch (error) {
      const grpcError = toGrpcError(error)
      callback(grpcError, null as never)
    }
  },
  async bulkAddInventory(call, callback) {
    try {
      const payload = bulkAddInventoryDomainSchema.safeParse(call.request)
      if (!payload.success) {
        return callback(payload.error, null)
      }
      const response = await bulkAddInventory(payload.data)
      callback(null, {
        products: response.map((item) => ({
          sku: item.sku,
        })),
        totalAdded: response.length,
      })
    } catch (err) {
      const grpcError = toGrpcError(err)
      callback(grpcError, null as never)
    }
  },

  async updateInventory(call, callback) {
    try {
      const payload = updateInventoryDomainSchema.safeParse(call.request)
      if (!payload.success) {
        return callback(payload.error, null)
      }
      const response = await updateInventory(payload.data)
      callback(null, {
        sku: response.sku,
      })
    } catch (err) {
      const grpcError = toGrpcError(err)
      callback(grpcError, null as never)
    }
  },
  async checkAvailability(call, callback) {
    const payload = checkAvailabilityDomainSchema.safeParse(call.request)
    if (!payload.success) {
      return callback(payload.error, null)
    }
  },
  async reserveStock(call, callback) {
    try {
      const payload = ReserveStockRequestSchema.safeParse(call.request)
      if (!payload.success) {
        return callback(payload.error, null)
      }
      const response = await reserveStock(payload.data)
      callback(null, response)
    } catch (err) {
      const grpcError = toGrpcError(err)
      callback(grpcError, null as never)
    }
  },
  async releaseReservation() {},
  async confirmReservation() {},
}
