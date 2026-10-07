import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AllExceptionsFilter,
  DUPLICATE_RECORD_MESSAGE,
  GENERIC_SERVER_ERROR_MESSAGE,
  REQUEST_TOO_LARGE_MESSAGE,
} from './all-exceptions.filter';

function run(exception: unknown, nodeEnv: string) {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({
        method: 'DELETE',
        url: '/api/v1/settings/kitchen-zones/z1',
        headers: { 'x-request-id': 'req-1' },
      }),
    }),
  } as unknown as ArgumentsHost;
  const config = { get: () => nodeEnv } as unknown as ConfigService;
  const filter = new AllExceptionsFilter(config);
  jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  filter.catch(exception, host);
  return {
    status: (status.mock.calls[0] as unknown[])[0],
    body: (json.mock.calls[0] as Record<string, unknown>[])[0],
  };
}

const prismaError = new Error(
  'Invalid `this.prisma.kitchenZone.delete()` invocation in E:\\app\\settings.repository.ts:332 — Foreign key constraint violated',
);

describe('AllExceptionsFilter', () => {
  it('hides an unexpected error’s internals in production', () => {
    const { status, body } = run(prismaError, 'production');

    expect(status).toBe(500);
    expect(body.message).toBe(GENERIC_SERVER_ERROR_MESSAGE);
    expect(JSON.stringify(body)).not.toContain('prisma');
    expect(body).not.toHaveProperty('stack');
    expect(body.requestId).toBe('req-1');
  });

  it('keeps the real message (and stack) in development', () => {
    const { body } = run(prismaError, 'development');

    expect(body.message).toContain('kitchenZone.delete');
    expect(body).toHaveProperty('stack');
  });

  it('passes an intentional HTTP error message through in production', () => {
    const { status, body } = run(
      new BadRequestException('Give the slot a name.'),
      'production',
    );

    expect(status).toBe(400);
    expect(body.message).toBe('Give the slot a name.');
  });

  it('keeps a body-parser error’s own 4xx status (body too large → 413)', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      statusCode: 413,
      expose: true,
      type: 'entity.too.large',
    });
    const { status, body } = run(tooLarge, 'production');

    expect(status).toBe(413);
    expect(body.message).toBe(REQUEST_TOO_LARGE_MESSAGE);
  });

  it('turns a unique-constraint clash (Prisma P2002) into a 409, never a 500', () => {
    const clash = Object.assign(
      new Error('Unique constraint failed on the fields: (`tenantId`,`email`)'),
      { code: 'P2002' },
    );
    const { status, body } = run(clash, 'development');

    expect(status).toBe(409);
    expect(body.message).toBe(DUPLICATE_RECORD_MESSAGE);
  });

  it('never trusts a status on an error that is not meant for the client', () => {
    const internal = Object.assign(new Error('db exploded'), { status: 404 });
    const { status, body } = run(internal, 'production');

    expect(status).toBe(500);
    expect(body.message).toBe(GENERIC_SERVER_ERROR_MESSAGE);
  });
});
