import { z } from 'zod'

const baseEnvelopeSchema = z.object({
  eventId: z.uuid(),
  eventType: z.string(),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
})

export type EventEnvelope<T> = z.infer<typeof baseEnvelopeSchema> & {
  payload: T
}

export const createEventEnvelopeSchema = <T extends z.ZodTypeAny>(
  payloadSchema: T
) =>
  baseEnvelopeSchema
    .extend({
      payload: payloadSchema,
    })
    .strict()
