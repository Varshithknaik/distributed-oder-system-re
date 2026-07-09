import { status } from '@grpc/grpc-js'

export enum DOMAIN_ERROR_CODE {
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  NOT_FOUND = 'NOT_FOUND',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  INTERNAL = 'INTERNAL',
}

export const DOMAIN_TO_GRPC: Record<DOMAIN_ERROR_CODE, status> = {
  [DOMAIN_ERROR_CODE.DUPLICATE_ENTRY]: status.ALREADY_EXISTS,
  [DOMAIN_ERROR_CODE.NOT_FOUND]: status.NOT_FOUND,
  [DOMAIN_ERROR_CODE.FOREIGN_KEY_VIOLATION]: status.FAILED_PRECONDITION,
  [DOMAIN_ERROR_CODE.INTERNAL]: status.INTERNAL,
}

export class DomainError extends Error {
  public readonly code: DOMAIN_ERROR_CODE
  public readonly details?: string

  constructor(code: DOMAIN_ERROR_CODE, message: string, details?: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}
