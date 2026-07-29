import dotenv from 'dotenv'
import { z } from 'zod'
dotenv.config({ quiet: true })

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // READ_SERVICE_HTTP_PORT: z.coerce
  //   .number()
  //   .int()
  //   .min(1)
  //   .max(65_535)
  //   .default(3_004),
  MONGO_URI: z.string().min(1),
  // READ_INTERNAL_TOKEN: z.string().min(32),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_CA: z.string().min(1),
  KAFKA_CERT: z.string().min(1),
  KAFKA_KEY: z.string().min(1),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().nonnegative().default(10),
})

const raw = EnvSchema.parse(process.env)

export const env = {
  grpcHost: '0.0.0.0',
  // grpcPort: raw.READ_SERVICE_HTTP_PORT,
  kafkaBrokers: raw.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  mongoURI: raw.MONGO_URI,
  lowStockThreshold: raw.LOW_STOCK_THRESHOLD,
}
