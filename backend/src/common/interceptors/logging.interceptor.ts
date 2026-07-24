import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const requestId = req.headers['x-request-id'];
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.logger.log(
          `${method} ${url} ${res.statusCode} ${Date.now() - start}ms [${requestId}]`,
        );
      }),
      catchError((err) => {
        this.logger.error(
          `${method} ${url} ERROR ${Date.now() - start}ms [${requestId}]`,
          err.stack,
        );
        return throwError(() => err);
      }),
    );
  }
}
