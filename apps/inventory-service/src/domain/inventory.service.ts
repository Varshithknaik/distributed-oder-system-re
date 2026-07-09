import { addInventory } from '../reporitory/inventory.repository.js'
import {
  AddInventoryInput,
  addInventoryDomainSchema,
} from '../schema/inventory.schema.js'

export async function addInventoryDomain(input: AddInventoryInput) {
  const payload = addInventoryDomainSchema.safeParse(input)
  if (!payload.success) {
    throw payload.error.issues
  }

  return await addInventory(payload.data)
}
