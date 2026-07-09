import mongoose, { Schema } from 'mongoose'

const OrderItemSubSchema = new Schema(
  {
    id: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    offerPrice: { type: Number },
    effectiveUnitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    productName: { type: String },
  },
  { _id: false }
)

export interface IOrderView extends Document {
  orderId: string
  createdBy: string
  status: string
  total: number
  items: Array<{
    id: string
    sku: string
    quantity: number
    unitPrice: number
    offerPrice?: number
    effectiveUnitPrice: number
    lineTotal: number
    productName: string
  }>
  version: number
  lastEventId: string
  createdAt: Date
  updatedAt: Date
  projectedAt: Date
}

export const OrderViewSchema = new Schema<IOrderView>(
  {
    createdBy: { type: String, required: true },
    orderId: { type: String, required: true },
    items: { type: [OrderItemSubSchema], default: [] },
    status: { type: String, required: true },
    total: { type: Number, required: true },
    version: { type: Number, required: true },
    lastEventId: { type: String, required: true },
    projectedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

OrderViewSchema.index({ orderId: 1 }, { unique: true })
OrderViewSchema.index({ userId: 1 })
OrderViewSchema.index({ status: 1 })
OrderViewSchema.index({ createdAt: -1 })
OrderViewSchema.index({ updatedAt: -1 })

export const OrderView = mongoose.model<IOrderView>(
  'OrderView',
  OrderViewSchema
)
