import { z } from 'zod'
import { createEventEnvelopeSchema } from '../envelope.js'

export const userCreatedSchema = z.object({
  email: z.email(),
  name: z.string(),
  id: z.cuid(),
})

export const UserCreatedEventEnvelopeSchema =
  createEventEnvelopeSchema(userCreatedSchema)

export type UserCreatedEvent = z.infer<typeof userCreatedSchema>
