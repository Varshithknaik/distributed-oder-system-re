import { JwtPayload } from 'jsonwebtoken'

export interface AuthUser extends JwtPayload {
  id: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
