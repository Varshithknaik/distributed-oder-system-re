import { UserCreatedEventEnvelopeSchema } from '@core/events'
import { ClientSession } from 'mongoose'
import { UserView } from '../models/userView.js'

export const processUserCreated = async ({
  payload,
  session,
}: {
  payload: unknown
  session: ClientSession
}) => {
  const parsed = UserCreatedEventEnvelopeSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error(
      '[READ SERVICE - USER] Invalid order confirmed event payload'
    )
  }

  const { payload: user } = parsed.data

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
