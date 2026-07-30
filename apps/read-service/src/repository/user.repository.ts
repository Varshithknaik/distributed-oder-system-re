import { userCreatedSchema } from '@core/events'
import { ClientSession } from 'mongoose'
import { UserView } from '../models/userView.js'

export const processUserCreated = async ({
  payload,
  session,
}: {
  payload: unknown
  session: ClientSession
}) => {
  const parsed = userCreatedSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('[READ SERVICE - USER] Invalid user created event payload')
  }

  const user = parsed.data

  await UserView.create(
    [
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        projectedAt: new Date(),
      },
    ],
    { session }
  )
}
