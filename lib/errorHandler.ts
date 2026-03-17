import { NextResponse } from 'next/server';
import { AppError, ErrorCode, ApiResponse } from '@/types';
import { logger } from './logger';

/**
 * Custom Application Error Class
 */
export class ApplicationError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error code to HTTP status code mapping
 */
const errorStatusCodes: Record<ErrorCode, number> = {
  AUTH_ERROR: 401,
  VALIDATION_ERROR: 400,
  DATABASE_ERROR: 500,
  AI_ERROR: 500,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  RATE_LIMIT_ERROR: 429,
};

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any
): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle errors and return appropriate API response
 */
export function handleError(error: unknown): NextResponse<ApiResponse> {
  // Log the error
  logger.error('Error occurred', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Handle ApplicationError
  if (error instanceof ApplicationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: createErrorResponse(error.code, error.message, error.details),
      },
      { status: error.statusCode }
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

/**
 * Async error handler wrapper
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse<ApiResponse>> {
  return handler().catch((error) => {
    return handleError(error);
  });
}

/**
 * Validation error helper
 */
export function throwValidationError(message: string, details?: any): never {
  throw new ApplicationError('VALIDATION_ERROR', message, 400, details);
}

/**
 * Auth error helper
 */
export function throwAuthError(message: string = 'Unauthorized'): never {
  throw new ApplicationError('AUTH_ERROR', message, 401);
}

/**
 * Not found error helper
 */
export function throwNotFoundError(
  resource: string = 'Resource',
  details?: any
): never {
  throw new ApplicationError(
    'NOT_FOUND',
    `${resource} not found`,
    404,
    details
  );
}

/**
 * Database error helper
 */
export function throwDatabaseError(message: string, details?: any): never {
  throw new ApplicationError('DATABASE_ERROR', message, 500, details);
}

/**
 * AI error helper
 */
export function throwAIError(message: string, details?: any): never {
  throw new ApplicationError('AI_ERROR', message, 500, details);
}

/**
 * Try-catch wrapper with error logging
 */
export async function tryCatch<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(
    (field) => !data[field] || data[field] === ''
  );

  if (missingFields.length > 0) {
    throwValidationError(`Missing required fields: ${missingFields.join(', ')}`, {
      missingFields,
    });
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}
