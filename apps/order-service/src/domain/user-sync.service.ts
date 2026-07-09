import { userCreatedSchema } from '@core/events'
import { logger } from '@core/logger'
import type { Prisma } from '@prisma/client-order-service'
import { createUser } from '../repository/user.repository.js'

export async function syncUserCreated(
  tx: Prisma.TransactionClient,
  payload: unknown
) {
  const parsed = userCreatedSchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error('Invalid USER_CREATED payload')
  }

  await createUser(tx, parsed.data)
  logger.info(`[USER_CREATED] User created: ${parsed.data.id}`)
}
