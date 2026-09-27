import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformEmailTemplateService } from '../notification-templates/platform-email-template.service';
import { TenantNotificationTemplateService } from '../notification-templates/tenant-notification-template.service';
import { EmailProviderFactory } from '../../modules/notifications/providers/email/email-provider.factory';
import { renderTemplateString } from '../notification-templates/template-renderer.util';
import * as branding from '../email-layout/tenant-branding.util';

const BODY = '<p>Hi {{firstName}}</p><a href="{{inviteUrl}}">go</a>';

function renderer(label: string) {
  return jest.fn((...args: unknown[]) => {
    const data = args[args.length - 1] as Record<string, string>;
    return Promise.resolve({
      subject: renderTemplateString(`${label}: {{firstName}}`, data),
      html: renderTemplateString(BODY, data),
    });
  });
}

const platformTemplates = { render: renderer('platform') };
const tenantTemplates = { renderEmail: renderer('tenant') };
const tenantProvider = { sendMail: jest.fn().mockResolvedValue({}) };
const emailFactory = { create: jest.fn() };
const prisma = { notificationSettings: { findUnique: jest.fn() } };

function build(): MailService {
  return new MailService(
    { get: () => undefined } as unknown as ConfigService,
    prisma as unknown as PrismaService,
    platformTemplates as unknown as PlatformEmailTemplateService,
    tenantTemplates as unknown as TenantNotificationTemplateService,
    emailFactory as unknown as EmailProviderFactory,
  );
}

describe('MailService — tenant-branded emails', () => {
  let service: MailService;
  let platformSend: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(branding, 'getTenantEmailBranding').mockResolvedValue({
      businessName: 'Tom & Jerry',
      logoUrl: null,
      showPoweredBy: true,
    } as Awaited<ReturnType<typeof branding.getTenantEmailBranding>>);
    service = build();
    platformSend = jest.spyOn(service, 'send').mockResolvedValue();
    prisma.notificationSettings.findUnique.mockResolvedValue({
      tenantId: 't1',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("sends a customer's invite from the tenant's own email with the tenant's template", async () => {
    emailFactory.create.mockReturnValue(tenantProvider);

    await service.sendAccountInvite('p@example.com', 't1', {
      firstName: 'Priya',
      inviteUrl: 'https://demo.okaysync.com/reset-password?token=t&invite=1',
    });

    expect(tenantTemplates.renderEmail).toHaveBeenCalledWith(
      't1',
      'account-invite',
      expect.any(Object),
    );
    expect(platformTemplates.render).not.toHaveBeenCalled();
    expect(tenantProvider.sendMail).toHaveBeenCalledTimes(1);
    expect(platformSend).not.toHaveBeenCalled();
  });

  it('falls back to the platform SMTP when the tenant has no email set up', async () => {
    emailFactory.create.mockReturnValue(null);

    await service.sendWelcome('p@example.com', 't1', { firstName: 'Priya' });

    expect(tenantTemplates.renderEmail).toHaveBeenCalled();
    expect(platformSend).toHaveBeenCalledTimes(1);
  });

  it('falls back to the platform SMTP when the tenant has no notification settings row', async () => {
    prisma.notificationSettings.findUnique.mockResolvedValue(null);

    await service.sendWelcome('p@example.com', 't1', { firstName: 'Priya' });

    expect(emailFactory.create).not.toHaveBeenCalled();
    expect(platformSend).toHaveBeenCalledTimes(1);
  });

  it.each(['CUSTOMER', 'STAFF', undefined])(
    'sends a %s reset from the tenant',
    async (role) => {
      emailFactory.create.mockReturnValue(tenantProvider);
      await service.sendResetPassword(
        'p@example.com',
        't1',
        { resetUrl: 'https://x/reset-password?token=t' },
        role,
      );
      expect(tenantProvider.sendMail).toHaveBeenCalledTimes(1);
      expect(platformSend).not.toHaveBeenCalled();
    },
  );

  it.each(['OWNER', 'SUPER_ADMIN'])(
    'keeps an %s reset on the platform sender and wording',
    async (role) => {
      emailFactory.create.mockReturnValue(tenantProvider);
      await service.sendResetPassword(
        'o@example.com',
        't1',
        { resetUrl: 'https://x/reset-password?token=t' },
        role,
      );
      expect(platformTemplates.render).toHaveBeenCalled();
      expect(tenantTemplates.renderEmail).not.toHaveBeenCalled();
      expect(tenantProvider.sendMail).not.toHaveBeenCalled();
      expect(platformSend).toHaveBeenCalledTimes(1);
    },
  );

  it('escapes customer-typed values in the HTML body but not in the subject', async () => {
    emailFactory.create.mockReturnValue(null);

    await service.sendAccountInvite('p@example.com', 't1', {
      firstName: '<a href="https://evil.test">Claim prize</a>',
      inviteUrl: 'https://demo.okaysync.com/reset-password?token=t&invite=1',
    });

    const [, subject, html] = platformSend.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(html).not.toContain('<a href="https://evil.test">');
    expect(html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;');
    expect(html).toContain('token=t&amp;invite=1');
    expect(subject).toBe('tenant: <a href="https://evil.test">Claim prize</a>');
  });
});
