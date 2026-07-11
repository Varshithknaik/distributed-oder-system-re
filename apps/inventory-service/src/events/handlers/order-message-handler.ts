import { EventEnvelope, ORDER_EVENTS_TYPE } from '@core/events'
import { logger } from '@core/logger'
import { prisma } from '../../lib/prisma.js'
import { processInventoryOrderCancelled } from '../../reporitory/order.repository.js'
import { Prisma } from '@prisma/client-inventory-service'

interface ProcessInventoryOrderServiceProps {
  eventEventEnvelop: EventEnvelope<unknown>
  topic: string
  partition: number
  offset: string
  retry?: number
}

export const processInventoryOrderService = async ({
  eventEventEnvelop,
  topic,
  partition,
  offset,
  retry = 1,
}: ProcessInventoryOrderServiceProps) => {
  const { eventType, eventId, payload } = eventEventEnvelop
  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedEvent.create({
        data: {
          eventId,
          eventType,
          topic,
          partition,
          offset: BigInt(offset),
        },
      })
      switch (eventType) {
        case ORDER_EVENTS_TYPE.ORDER_CANCELLED:
          await processInventoryOrderCancelled({
            payload,
            tx,
          })
          break
        default:
          logger.error(
            `[INVENTORY SERVICE - ORDER] unhanled event of ${eventType} type`
          )
      }
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      logger.info(
        '[IDEMPOTENT] Event already processed in INVENTORY SERVICE - ORDER'
      )
      return
    }

    logger.error(
      `[CRITICAL] Event processing failed in INVENTORY SERVICE - ORDER at ATTEMPT number ${retry}`
    )
    throw error
  }
}
