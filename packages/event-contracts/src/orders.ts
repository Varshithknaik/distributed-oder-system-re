export enum OrderEvents {
  CREATED = 'ORDER_CONFIRMED',
  STOCK_RESERVED = 'STOCK_RESERVED',
  STOCK_RESERVED_FAILED = 'STOCK_RESERVED_FAILED',
  COMPLETED = 'ORDER_COMPLETED',
  CANCELLED = 'ORDER_CANCELLED',
}

export interface OrderCreatedPayload {
  orderId: string
  userId: string
  items: Array<{ sku: string; quantity: number }>
}

export interface StockReservedPayload {
  orderId: string
  status: 'SUCCESS' | 'FAILED'
  reason?: string
}
