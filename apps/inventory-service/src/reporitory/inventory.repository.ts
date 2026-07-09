import { Prisma } from '@prisma/client-inventory-service'
import { prisma } from '../lib/prisma.js'
import {
  AddInventoryInput,
  BulkAddInventoryInput,
  ReserveStockRequestInput,
  UpdateInventoryInput,
} from '../schema/inventory.schema.js'
import {
  EventEnvelope,
  InventoryProductCreated,
  TOPICS,
  INVENTORY_EVENTS_TYPE,
  InventoryProductUpdated,
  InventoryStockReserved,
  InventoryBulkCreated,
} from '@core/events'

export async function addInventory(product: AddInventoryInput) {
  return await prisma.$transaction(async (tx) => {
    const created = await tx.products.create({
      data: {
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        price: product.price,
        offerPrice: product.offerPrice,
      },
    })

    const envelope: EventEnvelope<InventoryProductCreated> = {
      eventId: crypto.randomUUID(),
      eventType: INVENTORY_EVENTS_TYPE.PRODUCT_ADDED,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        product: {
          sku: created.sku,
          name: created.name,
          category: created.category,
          stock: created.stock,
          price: created.price,
          offerPrice: created.offerPrice ?? undefined,
          updatedAt: created.updatedAt.toISOString(),
          version: created.version,
        },
      },
    }

    await tx.outBoxEvent.create({
      data: {
        id: envelope.eventId,
        aggregateType: 'inventory.product',
        aggregateId: created.sku,
        topic: TOPICS.INVENTORY_EVENTS,
        eventType: INVENTORY_EVENTS_TYPE.PRODUCT_ADDED,
        payload: envelope,
      },
    })

    return { sku: created.sku }
  })
}

export async function bulkAddInventory(products: BulkAddInventoryInput) {
  return await prisma.$transaction(async (tx) => {
    const createdItems = await tx.products.createManyAndReturn({
      data: products.products.map((product) => ({
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        price: product.price,
        offerPrice: product.offerPrice,
      })),
      skipDuplicates: true,
      select: {
        sku: true,
        name: true,
        category: true,
        stock: true,
        price: true,
        offerPrice: true,
        updatedAt: true,
        version: true,
      },
    })

    const envelope: EventEnvelope<InventoryBulkCreated> = {
      eventId: crypto.randomUUID(),
      eventType: INVENTORY_EVENTS_TYPE.BULK_ADDED,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        products: createdItems.map((created) => ({
          sku: created.sku,
          name: created.name,
          category: created.category,
          stock: created.stock,
          price: created.price,
          offerPrice: created.offerPrice ?? undefined,
          updatedAt: created.updatedAt.toISOString(),
          version: created.version,
        })),
      },
    }
    await tx.outBoxEvent.create({
      data: {
        id: envelope.eventId,
        aggregateType: 'inventory.product',
        aggregateId: crypto.randomUUID(),
        topic: TOPICS.INVENTORY_EVENTS,
        eventType: INVENTORY_EVENTS_TYPE.BULK_ADDED,
        payload: envelope,
      },
    })

    return createdItems.map((item) => ({ sku: item.sku }))
  })
}

export async function updateInventory(payload: UpdateInventoryInput) {
  const { sku, ...rest } = payload

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.products.update({
      where: { sku },
      data: {
        stock: rest.stock ?? undefined,
        price: rest.price ?? undefined,
        offerPrice: rest.offerPrice ?? undefined,
        name: rest.name ?? undefined,
        category: rest.category ?? undefined,
        version: {
          increment: 1,
        },
      },
    })

    const envelope: EventEnvelope<InventoryProductUpdated> = {
      eventId: crypto.randomUUID(),
      eventType: INVENTORY_EVENTS_TYPE.PRODUCT_UPDATED,
      occurredAt: new Date().toISOString(),
      version: 1,
      payload: {
        products: [
          {
            sku: updated.sku,
            name: updated.name,
            category: updated.category,
            stock: updated.stock,
            price: updated.price,
            offerPrice: updated.offerPrice ?? undefined,
            updatedAt: updated.updatedAt.toISOString(),
            version: updated.version,
          },
        ],
      },
    }

    await tx.outBoxEvent.create({
      data: {
        id: envelope.eventId,
        aggregateType: 'inventory.product',
        aggregateId: updated.sku,
        topic: TOPICS.INVENTORY_EVENTS,
        eventType: INVENTORY_EVENTS_TYPE.PRODUCT_UPDATED,
        payload: envelope,
      },
    })

    return { sku: updated.sku }
  })
}

export class OptimisticStockConflictError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export async function reserveStock(payload: ReserveStockRequestInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const quantityBySku = new Map<string, number>()

      for (const item of payload.items) {
        quantityBySku.set(
          item.sku,
          (quantityBySku.get(item.sku) ?? 0) + item.quantity
        )
      }

      const requestedItems = Array.from(quantityBySku, ([sku, quantity]) => ({
        sku,
        quantity,
      }))

      const requestedSkus = requestedItems.map((item) => item.sku)

      const existingReservations = await tx.reservations.findMany({
        where: {
          orderId: payload.orderId,
        },
        select: {
          sku: true,
          quantity: true,
          product: {
            select: {
              price: true,
              offerPrice: true,
              stock: true,
              version: true,
              name: true,
            },
          },
        },
      })

      const hasExistingReservations = existingReservations.length > 0

      const isSameReservationRequest =
        existingReservations.length === requestedItems.length &&
        existingReservations.every((reservedItem) => {
          const skuQuantity = quantityBySku.get(reservedItem.sku)
          if (!skuQuantity) return false
          return skuQuantity === reservedItem.quantity
        })

      if (hasExistingReservations && isSameReservationRequest) {
        return {
          orderId: payload.orderId,
          success: true,
          items: existingReservations.map((item) => {
            return {
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.product.price,
              offerPrice: item.product.offerPrice ?? undefined,
              remainingStock: item.product.stock,
              version: item.product.version,
              productName: item.product.name,
            }
          }),
          reason: '',
        }
      } else if (hasExistingReservations) {
        throw new OptimisticStockConflictError('IDEMPOTENCY_CONFLICT')
      }

      const products = await tx.$queryRaw<
        {
          sku: string
          stock: number
          version: number
          price: number
          offerPrice: number | null
          name: string
        }[]
      >`
        SELECT sku, stock, version, price, offer_price AS "offerPrice" , name
        FROM "Products" 
        WHERE sku IN (${Prisma.join(requestedSkus)})
        FOR UPDATE
        `

      const productBySku = new Map(products.map((p) => [p.sku, p]))

      const failures = []

      for (const item of requestedItems) {
        const product = productBySku.get(item.sku)

        if (!product) {
          failures.push({
            sku: item.sku,
            reason: 'SKU_NOT_FOUND',
          })
          continue
        }

        if (product.stock < item.quantity) {
          failures.push({
            sku: item.sku,
            reason: 'INSUFFICIENT_STOCK',
            requested: item.quantity,
            available: product.stock,
          })
        }
      }

      if (failures.length > 0) {
        throw new OptimisticStockConflictError(
          JSON.stringify({ failures }, null, 2)
        )
      }

      await tx.reservations.createMany({
        data: requestedItems.map((item) => ({
          orderId: payload.orderId,
          sku: item.sku,
          quantity: item.quantity,
        })),
      })

      // const caseStatement = requestedItems.map(
      //   (item) => Prisma.sql`WHEN ${item.sku} THEN ${item.quantity}::int`
      // )

      // const query = Prisma.sql`
      //   UPDATE "Products"
      //   SET
      //     stock = stock - CASE sku
      //       ${Prisma.join(caseStatement)}
      //       ELSE 0
      //     END,
      //     version = version + 1
      //   WHERE sku IN (${Prisma.join(requestedSkus)})
      // `
      // await tx.$executeRaw(query)

      const values = Prisma.join(
        requestedItems.map(
          ({ sku, quantity }) => Prisma.sql`(${sku},${quantity})`
        )
      )

      console.log(values)

      await tx.$executeRaw`
        UPDATE "Products" p
        SET
          stock = p.stock - v.quantity,
          version = p.version + 1
          FROM (
            VALUES ${values}
          ) AS v(sku, quantity)
          WHERE p.sku = v.sku
      `

      const envelope: EventEnvelope<InventoryStockReserved> = {
        eventId: crypto.randomUUID(),
        eventType: INVENTORY_EVENTS_TYPE.STOCK_RESERVED,
        occurredAt: new Date().toISOString(),
        version: 1,
        payload: {
          orderId: payload.orderId,
          items: requestedItems.map((item) => {
            const product = productBySku.get(item.sku)
            return {
              sku: item.sku,
              quantity: item.quantity,
              remainingStock: product!.stock - item.quantity,
              version: product!.version + 1,
            }
          }),
          reservedAt: new Date().toISOString(),
        },
      }

      await tx.outBoxEvent.create({
        data: {
          id: envelope.eventId,
          aggregateType: 'inventory.product',
          aggregateId: payload.orderId,
          topic: TOPICS.INVENTORY_EVENTS,
          eventType: INVENTORY_EVENTS_TYPE.STOCK_RESERVED,
          payload: envelope,
        },
      })

      return {
        orderId: payload.orderId,
        success: true,
        items: requestedItems.map((item) => {
          const product = productBySku.get(item.sku)!
          return {
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: product.price,
            offerPrice: product.offerPrice ?? undefined,
            remainingStock: product.stock - item.quantity,
            version: product.version + 1,
            productName: product.name,
          }
        }),
        reason: '',
      }
    })
  } catch (error) {
    if (error instanceof OptimisticStockConflictError) {
      return {
        orderId: payload.orderId,
        success: false,
        items: [],
        reason: error.message,
      }
    }
    throw error
  }
}
