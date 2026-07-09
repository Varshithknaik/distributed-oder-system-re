import { Prisma } from '@prisma/client-order-service'
import { DOMAIN_TO_GRPC, DomainError } from './error.js'
import { status as grpcStatus } from '@grpc/grpc-js'

export function toGrpcError(error: unknown) {
  if (error instanceof DomainError) {
    return {
      code: DOMAIN_TO_GRPC[error.code] || grpcStatus.INTERNAL,
      message: error.message,
      details: error.details,
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : ((
              error.meta as {
                driverAdaperError?: {
                  cause?: {
                    constraint?: {
                      fields?: string[]
                    }
                  }
                }
              }
            )?.driverAdaperError?.cause?.constraint?.fields?.join(',') ??
            'unknown')
        return {
          code: grpcStatus.ALREADY_EXISTS,
          message: `Resource already exists on constraint ${target}`,
        }
      case 'P2025':
        return {
          code: grpcStatus.NOT_FOUND,
          message: 'The record you are trying to access does not exists',
        }
      case 'P2003':
        return {
          code: grpcStatus.FAILED_PRECONDITION,
          message: `Foreign key contrainsts failed on: ${JSON.stringify(error.meta?.field_name)}`,
        }
      case 'P2012':
        return {
          code: grpcStatus.INTERNAL,
          message: error.message,
        }
      default:
        return {
          code: grpcStatus.INTERNAL,
          message: `Unhandled database error code: ${error.code}`,
        }
    }
  }

  return {
    code: grpcStatus.INTERNAL,
    message: error instanceof Error ? error.message : 'Internal server error',
  }
}
