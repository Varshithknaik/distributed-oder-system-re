import { KafkaClient } from '@core/kafka'
import { env } from '../config/env.js'

export function createKafkaClient(clientId: string) {
  return new KafkaClient(clientId, env.kafkaBrokers)
}
