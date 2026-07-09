export interface DLQMessage {
  originalTopic: string
  originalPartition: number
  originalOffset: string
  originalTimestamp: string
  rawPayload: string
  errorMessage: string
  errorStack: string
  failedAt: string
  consumerGroup: string
  retryCount: number
}
