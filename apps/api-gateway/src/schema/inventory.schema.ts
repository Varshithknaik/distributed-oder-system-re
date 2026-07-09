import z from 'zod'

export const addInventorySchema = z.object({
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  stock: z.number().int(),
  price: z.number(),
  offerPrice: z.number().optional(),
})

export const updateInventorySchema = z.object({
  sku: z.string(),
  stock: z.number().int().optional(),
  price: z.number().optional(),
  offerPrice: z.number().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
})
