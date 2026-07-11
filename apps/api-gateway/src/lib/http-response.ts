import { ServiceError } from '@grpc/grpc-js'
import { Response } from 'express'

export type ApiSuccessResponse<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorResponse = {
  success: false
  message: string
  error?: unknown
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiSuccessResponse<T>)
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { error: details } : {}),
  } satisfies ApiErrorResponse)
}

export function parseGrpcError(err: ServiceError) {
  try {
    return JSON.parse(err.details)
  } catch {
    return {
      code: err.code,
      details: err.details,
    }
  }
}
