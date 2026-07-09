import { KafkaClient } from '@core/kafka'
import { env } from '../config/env.js'

export function createOrderKafkaClient(clientId: string) {
  return new KafkaClient(clientId, env.kafkaBrokers)
}
