import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'
import { sendError } from '../lib/http-response.js'
import { AuthUser } from '../types/express.js'

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return sendError(res, 401, 'Unauthorized')
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    if (typeof decoded === 'string') {
      return sendError(res, 401, 'Invalid token')
    }
    req.user = decoded as AuthUser
    next()
  } catch {
    return sendError(res, 401, 'Unauthorized')
  }
}
