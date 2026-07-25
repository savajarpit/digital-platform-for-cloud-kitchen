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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = this.config.get('app.nodeEnv') === 'production';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const isStructuredResponse =
      typeof exceptionResponse === 'object' && exceptionResponse !== null;

    const message = isStructuredResponse
      ? (exceptionResponse as any).message
      : exception instanceof Error
        ? exception.message
        : 'Internal server error';

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
      `[${request.headers['x-request-id']}] ${request.method} ${request.url} → ${status}`,
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
