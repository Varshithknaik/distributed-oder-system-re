import { Router } from 'express'

export const orderQueryRoute = Router()

orderQueryRoute.get('/:id', () => {
  console.log('called')
})
