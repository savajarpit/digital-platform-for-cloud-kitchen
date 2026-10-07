import { cleanValidationMessage } from '../utils/validation-message.util';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

export const GENERIC_SERVER_ERROR_MESSAGE =
  'Something went wrong — please try again.';

export const REQUEST_TOO_LARGE_MESSAGE =
  'This request is too large — shorten the text or use fewer items.';

/** Express's body parser (http-errors) throws plain errors with their own
 * 4xx `status` and `expose: true` — e.g. a body over the size limit. They
 * are the client's fault, so keep that status instead of turning them into
 * a 500. */
export const DUPLICATE_RECORD_MESSAGE =
  'This already exists — use a different value.';

function clientErrorOf(
  exception: unknown,
): { status: number; message: string } | null {
  if (typeof exception !== 'object' || exception === null) return null;
  // A unique-constraint clash the service didn't pre-check (or lost a race
  // on) is a conflict, not a server error.
  if ((exception as { code?: unknown }).code === 'P2002') {
    return { status: 409, message: DUPLICATE_RECORD_MESSAGE };
  }
  const { status, expose, type, message } = exception as {
    status?: unknown;
    expose?: unknown;
    type?: unknown;
    message?: unknown;
  };
  if (typeof status !== 'number' || status < 400 || status >= 500) return null;
  if (expose !== true) return null;
  return {
    status,
    message:
      type === 'entity.too.large'
        ? REQUEST_TOO_LARGE_MESSAGE
        : typeof message === 'string'
          ? message
          : 'Bad request',
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = this.config.get('app.nodeEnv') === 'production';

    const clientError =
      exception instanceof HttpException ? null : clientErrorOf(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (clientError?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const isStructuredResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null;

    // An unexpected (non-HTTP) error's own message can carry internals — a
    // Prisma error includes the query, server file paths and constraint
    // names. Production clients get a generic sentence (plus the requestId
    // for support); the full error is always in the server log below.
    const rawMessage = (
      isStructuredResponse
        ? (exceptionResponse as { message?: string | string[] }).message
        : exception instanceof HttpException
          ? exception.message
          : clientError
            ? clientError.message
            : isProd
              ? GENERIC_SERVER_ERROR_MESSAGE
              : exception instanceof Error
                ? exception.message
                : 'Internal server error'
    ) as string | string[];
    const message = Array.isArray(rawMessage)
      ? rawMessage.map(cleanValidationMessage)
      : rawMessage;

    // Exceptions thrown as `new ForbiddenException({ message, code, ... })`
    // can carry machine-readable extras (e.g. `code: 'ACCOUNT_NOT_VERIFIED'`)
    // beyond the message — pass those through so the frontend can branch on
    // them instead of string-matching the message.
    const extras = isStructuredResponse
      ? Object.fromEntries(
          Object.entries(exceptionResponse as Record<string, unknown>).filter(
            ([key]) => !['message', 'statusCode', 'error'].includes(key),
          ),
        )
      : {};

    this.logger.error(
      `[${String(request.headers['x-request-id'])}] ${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : [message],
      data: null,
      ...extras,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'],
      ...(isProd
        ? {}
        : {
            stack: exception instanceof Error ? exception.stack : undefined,
          }),
    });
  }
}
