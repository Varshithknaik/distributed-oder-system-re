import './config/env.js'
import { logger } from '@core/logger'
import { replayFromOffset } from './events/consumers/user-replay.consumer.js'

const args = process.argv.slice(2)
const parsed: Record<string, string> = {}

args.forEach((arg) => {
  const [key, value] = arg.split('=')
  parsed[key.replace(/^--/, '')] = value
})

const fromOffset = parsed.offset || process.env.REPLAY_OFFSET
const partition = parseInt(parsed.partition || process.env.REPLAY_PARTITION!)
const stopAfter = parseInt(parsed.stopAfter || process.env.REPLAY_STOP_AFTER!)

if (!fromOffset || partition === undefined || !stopAfter) {
  logger.error(
    '[ORDER REPLAY] Partition and offset are required for replayFromOffset'
  )
  process.exit(1)
}

logger.info(
  `[ORDER REPLAY] Starting replay from offset ${fromOffset} on partition ${partition} and stopping after ${stopAfter} messages`
)

const { consumer, done } = await replayFromOffset(
  fromOffset,
  partition,
  stopAfter
).catch((err) => {
  logger.error('[ORDER REPLAY] Failed to replay messages', err)
  process.exit(1)
})

process.on('SIGINT', async () => {
  logger.info('[ORDER REPLAY] SIGINT received, shutting down gracefully...')
  await consumer.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('[ORDER REPLAY] SIGTERM received, shutting down gracefully...')
  await consumer.disconnect()
  process.exit(0)
})

await done

logger.info('[ORDER REPLAY] Replay complete')
process.exit(0)
