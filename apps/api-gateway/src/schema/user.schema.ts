import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string(),
  email: z.email(),
})

export const loginUserSchema = z
  .object({
    email: z.email(),
  })
  .strict()

export type CreateUserEvent = z.infer<typeof createUserSchema>
export type LoginUserEvent = z.infer<typeof loginUserSchema>
