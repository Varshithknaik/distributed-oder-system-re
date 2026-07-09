export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export function deriveStockStatus(stock: number): StockStatus {
  if (stock === 0) return 'out_of_stock'
  if (stock <= Number(process.env.LOW_STOCK_THRESHOLD ?? '10'))
    return 'low_stock'
  return 'in_stock'
}

export function deriveEffectivePrice(
  price: number,
  offerPrice?: number | null
): number {
  if (offerPrice && offerPrice > 0) return offerPrice
  return price
}
