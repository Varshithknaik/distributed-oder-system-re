import util from 'node:util'
import winston from 'winston'

const isProd = process.env.NODE_ENV === 'production'
const SPLAT = Symbol.for('splat')
const CORE_KEYS = new Set(['level', 'message', 'timestamp', 'stack'])

type LogMeta = Record<string, unknown>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function getErrorMessage(stack?: string) {
  if (!stack) return undefined

  const [firstLine] = stack.split('\n')
  const separatorIndex = firstLine.indexOf(': ')

  return separatorIndex === -1
    ? undefined
    : firstLine.slice(separatorIndex + 2).trim()
}

function inspectMeta(meta: LogMeta) {
  return util.inspect(meta, {
    colors: !isProd,
    compact: false,
    depth: null,
    breakLength: 120,
    sorted: true,
  })
}

const normalizeLog = winston.format((info) => {
  const metadata: LogMeta = {}
  const splat = Array.isArray(info[SPLAT]) ? info[SPLAT] : []
  const extras: unknown[] = []

  for (const [key, value] of Object.entries(info)) {
    if (CORE_KEYS.has(key)) continue
    metadata[key] = value
    delete info[key]
  }

  for (const value of splat) {
    if (value instanceof Error) {
      info.stack ??= value.stack
      continue
    }

    if (isPlainObject(value)) {
      Object.assign(metadata, value)
      continue
    }

    extras.push(value)
  }

  if (extras.length > 0) {
    metadata.extra = extras
  }

  const errorMessage =
    typeof info.stack === 'string' ? getErrorMessage(info.stack) : undefined
  if (
    typeof info.message === 'string' &&
    errorMessage &&
    info.message !== errorMessage &&
    info.message.endsWith(` ${errorMessage}`)
  ) {
    info.message = info.message.slice(0, -(errorMessage.length + 1))
  }

  if (Object.keys(metadata).length > 0) {
    info.meta = metadata
  }

  return info
})

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  normalizeLog(),
  winston.format.json()
)

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  normalizeLog(),
  winston.format.colorize({ all: false }),
  winston.format.printf(({ timestamp, level, message, meta, stack }) => {
    const lines = [`${timestamp} ${level} ${message}`]

    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
      lines.push(inspectMeta(meta as LogMeta))
    }

    if (typeof stack === 'string' && stack.length > 0) {
      lines.push(stack)
    }

    return lines.join('\n')
  })
)

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
})
