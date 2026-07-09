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
  error?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(error !== undefined ? { error } : {}),
  } satisfies ApiErrorResponse)
}
