import { DOMAIN_TO_GRPC, DomainError } from './errors.js'
import { Prisma } from '@prisma/client-inventory-service'
import grpc from '@grpc/grpc-js'

export function toGrpcError(error: unknown): {
  code: grpc.status
  message: string
} {
  if (error instanceof DomainError) {
    return {
      code: DOMAIN_TO_GRPC[error.code] || grpc.status.INTERNAL,
      message: error.details ?? error.message,
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : ((
              error.meta as {
                driverAdapterError?: {
                  cause?: {
                    constraint?: {
                      fields?: string[]
                    }
                  }
                }
              }
            )?.driverAdapterError?.cause?.constraint?.fields?.join(', ') ??
            'unknown field')
        return {
          code: grpc.status.ALREADY_EXISTS,
          message: `Duplicate value on: ${target}`,
        }
      }
      case 'P2025':
        return {
          code: grpc.status.NOT_FOUND,
          message: 'The record you are trying to access does not exist.',
        }
      case 'P2003':
        return {
          code: grpc.status.FAILED_PRECONDITION,
          message: `Foreign key constraint failed on: ${error.meta?.field_name}`,
        }
      case 'P2010': {
        return {
          code: grpc.status.INTERNAL,
          message: error.message,
        }
      }
      default:
        return {
          code: grpc.status.INTERNAL,
          message: `Unhandled database error code: ${error.code}`,
        }
    }
  }

  return {
    code: grpc.status.INTERNAL,
    message: error instanceof Error ? error.message : 'Internal server error',
  }
}
