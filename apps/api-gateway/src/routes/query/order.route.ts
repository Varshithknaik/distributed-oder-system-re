import { Router, Request, Response } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

export const orderQueryRoute = Router()

orderQueryRoute.get(
  '/:orderId',
  authMiddleware,
  (req: Request, res: Response) => {
    const { orderId } = req.params
    console.log('called', orderId)

    return res.json({ message: 'called', orderId })
  }
)
