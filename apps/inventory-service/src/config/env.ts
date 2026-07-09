import dotenv from 'dotenv'

dotenv.config({ quiet: true })

function requireEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const env = {
  grpcHost: '0.0.0.0',
  grpcPort: '50052',
  kafkaBrokers: [requireEnv('KAFKA_BROKERS')],
}
