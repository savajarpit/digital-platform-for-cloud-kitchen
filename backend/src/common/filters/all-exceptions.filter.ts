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

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    this.logger.error(
      `[${request.headers['x-request-id']}] ${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : [message],
      data: null,
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
