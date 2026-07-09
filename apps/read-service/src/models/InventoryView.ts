import mongoose, { Schema } from 'mongoose'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface IInventoryView {
  sku: string
  name: string
  category: string
  stock: number
  stockStatus: StockStatus
  price: number
  offerPrice?: number
  effectivePrice: number
  version: number
  lastEventId: string
  updatedAt: Date
  projectedAt: Date
}

const InventoryViewSchema = new Schema<IInventoryView>(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
    },
    price: { type: Number, required: true },
    offerPrice: { type: Number },
    effectivePrice: { type: Number, required: true },
    version: { type: Number, required: true },
    lastEventId: { type: String, required: true },
    projectedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false }
)

InventoryViewSchema.index({ sku: 1 }, { unique: true })
InventoryViewSchema.index({ category: 1 })
InventoryViewSchema.index({ stock: 1 })
InventoryViewSchema.index({ stockStatus: 1 })
InventoryViewSchema.index({ price: 1 })
InventoryViewSchema.index({ effectivePrice: 1 })
InventoryViewSchema.index({ updatedAt: -1 })

InventoryViewSchema.index({ sku: 'text', name: 'text', category: 'text' })

export const InventoryView = mongoose.model<IInventoryView>(
  'InventoryView',
  InventoryViewSchema
)
