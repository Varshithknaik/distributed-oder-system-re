import { KafkaClient } from '@core/kafka'

const KAFKA_BROKERS = process.env.KAFKA_BROKERS!
const kafka = new KafkaClient('api-gateway', [KAFKA_BROKERS])

export const publish = kafka.publish.bind(kafka)
