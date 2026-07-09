import type { UserCreatedEvent } from '@core/events'
import type { Prisma } from '@prisma/client-order-service'

export interface ProcessedEventRecord {
  eventId: string
  eventType: string
  topic: string
  partition: number
  offset: string
}

export async function recordProcessedEvent(
  tx: Prisma.TransactionClient,
  event: ProcessedEventRecord
) {
  await tx.processedEvent.create({
    data: {
      eventId: event.eventId,
      eventType: event.eventType,
      topic: event.topic,
      partition: event.partition,
      offset: BigInt(event.offset),
    },
  })
}

export async function createUser(
  tx: Prisma.TransactionClient,
  user: UserCreatedEvent
) {
  await tx.users.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })
}
