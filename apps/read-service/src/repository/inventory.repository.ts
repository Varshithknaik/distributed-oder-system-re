import {
  InventoryBulkCreatedSchema,
  InventoryProductCreatedSchema,
  InventoryProductUpdatedSchema,
  InventoryStockReservedSchema,
} from '@core/events'
import { InventoryView, StockStatus } from '../models/InventoryView.js'
import { ClientSession } from 'mongoose'
import { logger } from '@core/logger'

const getStockStatus = (stock: number): StockStatus => {
  if (stock === 0) {
    return 'out_of_stock'
  } else if (stock > 10) {
    return 'in_stock'
  } else {
    return 'low_stock'
  }
}

export const processProductAdded = async ({
  payload,
  eventId,
  occurredAt,
  session,
}: {
  payload: unknown
  eventId: string
  occurredAt: string
  session: ClientSession
}) => {
  const parsed = InventoryProductCreatedSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error(
      '[READ SERVICE - INVENTORY] Invalid product added event payload'
    )
  }
  const { product } = parsed.data

  await InventoryView.create(
    [
      {
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        stockStatus: getStockStatus(product.stock),
        price: product.price,
        offerPrice: product.offerPrice,
        effectivePrice: product.offerPrice ?? product.price,
        version: product.version,
        lastEventId: eventId,
        projectedAt: new Date(occurredAt),
      },
    ],
    { session }
  )
}

export const processStockReserved = async ({
  payload,
  eventId,
  occurredAt,
  session,
}: {
  payload: unknown
  eventId: string
  occurredAt: string
  session: ClientSession
}) => {
  const parsed = InventoryStockReservedSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error('[READ SERVICE] Invalid stock reserved event payload')
  }

  const items = parsed.data.items

  await InventoryView.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { sku: item.sku, version: { $lt: item.version } },
        update: {
          $set: {
            stock: item.remainingStock,
            stockStatus: getStockStatus(item.remainingStock),
            version: item.version,
            lastEventId: eventId,
            updatedAt: new Date(occurredAt),
            projectedAt: new Date(),
          },
        },
      },
    })),
    { session }
  )
}

export const processBulkAdded = async ({
  payload,
  eventId,
  occurredAt,
  session,
}: {
  payload: unknown
  eventId: string
  occurredAt: string
  session: ClientSession
}) => {
  const parsed = InventoryBulkCreatedSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error('[READ SERVICE] Invalid bulk add event payload')
  }

  const { products } = parsed.data

  await InventoryView.insertMany(
    products.map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category,
      stock: product.stock,
      stockStatus: getStockStatus(product.stock),
      price: product.price,
      offerPrice: product.offerPrice,
      effectivePrice: product.offerPrice ?? product.price,
      version: product.version,
      lastEventId: eventId,
      projectedAt: new Date(occurredAt),
    })),
    { session }
  )
}

export const processProductUpdated = async ({
  payload,
  eventId,
  occurredAt,
  session,
}: {
  payload: unknown
  eventId: string
  occurredAt: string
  session: ClientSession
}) => {
  const parsed = InventoryProductUpdatedSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error('[READ SERVICE] Invalid product update event payload')
  }

  const { products } = parsed.data

  const result = await InventoryView.bulkWrite(
    products.map((product) => {
      const effectivePrice = product.offerPrice ?? product.price
      return {
        updateOne: {
          filter: { sku: product.sku, version: { $lt: product.version } },
          update: {
            $set: {
              ...(product.name && { name: product.name }),
              ...(product.category && { category: product.category }),
              ...(product.price !== undefined && { price: product.price }),
              ...(product.offerPrice !== undefined && {
                offerPrice: product.offerPrice,
              }),
              ...(effectivePrice !== undefined && { effectivePrice }),
              ...(product.stock !== undefined && {
                stock: product.stock,
                stockStatus: getStockStatus(product.stock),
              }),
              version: product.version,
              lastEventId: eventId,
              projectedAt: new Date(),
              updatedAt: new Date(occurredAt),
            },
          },
        },
      }
    }),
    { session }
  )

  const unmatchedCount = products.length - result.matchedCount
  if (unmatchedCount > 0) {
    logger.warn('[READ SERVICE] PRODUCT_UPDATED: some updates were skipped', {
      eventId,
      expected: products.length,
      matched: result.matchedCount,
    })
  }
}
