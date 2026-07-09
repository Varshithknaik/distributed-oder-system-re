import { z } from 'zod'

export const userCreatedSchema = z.object({
  email: z.email(),
  name: z.string(),
  id: z.cuid(),
})

export type UserCreatedEvent = z.infer<typeof userCreatedSchema>
