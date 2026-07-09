import { Document, model, Schema } from 'mongoose'

export interface IProcessedEvent extends Document {
  eventId: string
  eventType: string
  topic: string
  partition: number
  offset: string
  processedAt: Date
}

const ProcessedEventSchema = new Schema<IProcessedEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    topic: { type: String, required: true },
    partition: { type: Number, required: true },
    offset: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

export const ProcessedEvent = model<IProcessedEvent>(
  'ProcessedEvent',
  ProcessedEventSchema
)
