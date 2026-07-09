import express from 'express'
import cors from 'cors'
import { logger } from '@core/logger'
import dotenv from 'dotenv'
import { orderRouter } from './routes/commands/order.routes.js'
import { authRouter } from './routes/auth.routes.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { sendSuccess } from './lib/http-response.js'
import { inventoryRouter } from './routes/commands/inventory.routes.js'

dotenv.config({ quiet: true })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.GATEWAY_PORT || 4000

const app = express()
app.use(cors())
app.use(express.json())

const fePath = path.join(__dirname, '../../web-client/dist')
app.use(express.static(fePath))
app.use('/user', authRouter)
app.use('/commands/order', orderRouter)
app.use('/commands/inventory', inventoryRouter)

app.get('/health', (req, res) => {
  return sendSuccess(res, 200, 'OK', {
    timestamp: new Date().toISOString(),
  })
})

app.use((_, res) => {
  res.sendFile(path.join(fePath, 'index.html'))
})

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`)
})
