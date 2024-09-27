export interface AppError {
  httpResponseCode: number;
  message: string;
  details?: any;
}

export interface FhirAppError extends AppError {
  fhirErrorCode: string;
}

export abstract class BaseAppError implements AppError {
  abstract readonly httpResponseCode: number;
  readonly message: string;
  readonly details?: any;

  constructor(message: string, details?: any) {
    this.message = message;
    this.details = details;
  }

}

export class BadRequestError extends BaseAppError {
  readonly httpResponseCode = 400;

  constructor(message?: string, details?: any) {
    super(message ?? 'Bad request', details);
  }
}

export class NotAuthorizedError extends BaseAppError {
  readonly httpResponseCode = 401;

  constructor(message?: string, details?: any) {
    super(message ?? 'Not authorized', details);
  }
}

export class ForbiddenError extends BaseAppError {
  readonly httpResponseCode = 403;

  constructor(message?: string, details?: any) {
    super(message ?? 'Forbidden', details);
  }
}

export class NotFoundError extends BaseAppError {
  readonly httpResponseCode = 404;

  constructor(message?: string) {
    super(message ?? 'Not found');
  }
}

export class MethodNotAllowedError extends BaseAppError {
  readonly httpResponseCode = 405;

  constructor(httpMethod: string) {
    super(`Unsupported HTTP method ${httpMethod}`);
  }
}

export class ResourceConflictError extends BaseAppError {
  readonly httpResponseCode = 409;

  constructor(message?: string, details?: any) {
    super(message ?? 'Conflict', details);
  }
}

export class PreconditionFailedError extends BaseAppError {
  readonly httpResponseCode = 412;

  constructor(message?: string, details?: any) {
    super(message ?? 'Precondition failed', details);
  }
}

export class ClientError extends BaseAppError {
  readonly httpResponseCode;

  constructor(message: string, details?: any, statusCode?: number) {
    super(message, details);

    this.httpResponseCode = statusCode ?? 400;
  }
}

export class ServerError extends BaseAppError {
  readonly httpResponseCode;

  constructor(message: string, details?: {
    cause?: any,
    responseCode?: number,
    message?: string,
    error?: string
    detail?: any,
  }) {
    super(message, details);

    this.httpResponseCode = 500;
  }
}

export class UnknownError extends BaseAppError{
  readonly httpResponseCode;

  constructor(message: string, details?: {
    cause?: any,
    responseCode?: number,
    message?: string,
    error?: string
    detail?: any,
  }) {
    super(message, details);

    this.httpResponseCode = 500;
  }
}

export class NotImplementedError extends BaseAppError {
  readonly httpResponseCode = 501;

  constructor(message: string, details?: {
    cause?: any,
    message?: string,
    error?: string
    detail?: any,
  }) {
    super(message);
  }
}
