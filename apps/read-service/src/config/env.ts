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
  grpcPort: process.env.READ_SERVICE_GRPC_PORT ?? '50053',
  kafkaBrokers: [requireEnv('KAFKA_BROKERS')],
  mongoURI: requireEnv('MONGO_URI'),
  lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? '10'),
}
