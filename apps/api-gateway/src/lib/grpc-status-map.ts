import { status as GrpcStatus } from '@grpc/grpc-js'

const GRPC_TO_HTTP_MAP: Record<number, number> = {
  [GrpcStatus.OK]: 200,
  [GrpcStatus.INVALID_ARGUMENT]: 400,
  [GrpcStatus.UNAUTHENTICATED]: 401,
  [GrpcStatus.PERMISSION_DENIED]: 403,
  [GrpcStatus.NOT_FOUND]: 404,
  [GrpcStatus.ALREADY_EXISTS]: 409,
  [GrpcStatus.FAILED_PRECONDITION]: 412,
  [GrpcStatus.RESOURCE_EXHAUSTED]: 429,
  [GrpcStatus.INTERNAL]: 500,
  [GrpcStatus.UNAVAILABLE]: 503,
  [GrpcStatus.DEADLINE_EXCEEDED]: 504,
}

export function grpcStatusToHttp(grpcCode: number): number {
  return GRPC_TO_HTTP_MAP[grpcCode] ?? 500
}
