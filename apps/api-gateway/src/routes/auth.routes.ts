import { Router } from 'express'
import { Request, Response } from 'express'
import { publish } from '../events/produce.js'
import { TOPICS, USER_EVENTS_TYPE, UserCreatedEvent } from '@core/events'
import { createUserSchema, loginUserSchema } from '../schema/user.schema.js'
import { prisma } from '../lib/prisma.js'
import { logger } from '@core/logger'
import jwt from 'jsonwebtoken'
import { sendError, sendSuccess } from '../lib/http-response.js'

export const authRouter = Router()
const jwtSecret = process.env.JWT_SECRET as string

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, name } = req.body

  const result = createUserSchema.safeParse({ email, name })

  if (!result.success) {
    return sendError(res, 400, 'Invalid request', result.error.flatten())
  }

  try {
    const userId = await prisma.$transaction(async (tx) => {
      const newUser = await tx.users.create({
        data: {
          email: result.data.email,
          name: result.data.name,
        },
      })

      await publish<UserCreatedEvent>(TOPICS.USER_EVENTS, {
        eventId: crypto.randomUUID(),
        eventType: USER_EVENTS_TYPE.USER_CREATED,
        occurredAt: new Date().toISOString(),
        version: 1,
        payload: {
          email: result.data.email,
          name: result.data.name,
          id: newUser.id,
        },
      })

      return newUser.id
    })
    return sendSuccess(res, 200, 'User registered successfully', { id: userId })
  } catch (error) {
    logger.error('Failed to create user and publish event', error)
    return sendError(res, 500, 'Internal server error')
  }
})

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email } = req.body

  const result = loginUserSchema.safeParse({ email })

  if (!result.success) {
    return sendError(res, 400, 'Invalid request', result.error.flatten())
  }

  try {
    const user = await prisma.users.findUnique({
      where: {
        email: result.data.email,
      },
    })

    if (!user) {
      return sendError(res, 404, 'User not found')
    }

    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, {
      expiresIn: '20m',
    })
    return sendSuccess(res, 200, 'Login successful', { token })
  } catch (error) {
    logger.error('Failed to login user', error)
    return sendError(res, 500, 'Internal server error')
  }
})

authRouter.get('/', async (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'OK', null)
})
