---
name: payment
description: >
  Read for any payment task: Stripe integration, webhook handling,
  subscription management, idempotency, or payment module structure.
  Read general-guidelines.md → nestjs.md → this file.
  Stripe docs:    https://stripe.com/docs
  Stripe webhooks: https://docs.stripe.com/webhooks
---

# Payment Skill

## PROJECT DECISIONS

```
Provider:     Stripe (default)
Location:     src/modules/billing/
Webhook:      rawBody: true in NestFactory.create() — required for signature verification
Idempotency:  Store processed Stripe event IDs in DB to prevent duplicate processing
Webhook route: @Public() + @ApiExcludeEndpoint() — no JWT, no throttle
Raw body:     /billing/webhook must receive raw Buffer — bypass JSON parsing
```

---

## INSTALL

```bash
npm install stripe
```

---

## MAIN.TS — rawBody required

```typescript
// main.ts — must set rawBody: true
const app = await NestFactory.create(AppModule, {
  rawBody: true,    // ← required for Stripe webhook signature verification
  bufferLogs: true,
});
```

---

## BILLING MODULE STRUCTURE

```
src/modules/billing/
├── billing.module.ts
├── billing.controller.ts      ← webhook endpoint here
├── billing.service.ts
├── stripe.service.ts          ← wraps Stripe SDK
├── dto/
│   ├── create-checkout.dto.ts
│   └── webhook-event.dto.ts
└── entities/ (or schemas/)
    └── webhook-event.entity.ts  ← stores processed event IDs
```

---

## STRIPE SERVICE

```typescript
// src/modules/billing/stripe.service.ts
@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(config.get<string>('stripe.secretKey'), {
      apiVersion: '2025-01-27.acacia',   // pin to latest stable version
    });
  }

  // Checkout session (one-time payment or subscription)
  async createCheckoutSession(params: {
    priceId: string;
    customerId?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      mode: 'subscription',             // or 'payment' for one-time
      line_items: [{ price: params.priceId, quantity: 1 }],
      customer: params.customerId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
  }

  // Verify webhook signature — always verify before processing
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.get<string>('stripe.webhookSecret'),
    );
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({ email, name });
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }
}
```

---

## WEBHOOK CONTROLLER

```typescript
// src/modules/billing/billing.controller.ts
@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Webhook — must be @Public(), raw body, no version prefix issues
  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()            // hide from Swagger docs
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(req.rawBody, signature);
  }
}
```

---

## WEBHOOK SERVICE (with idempotency)

```typescript
// src/modules/billing/billing.service.ts
async handleWebhook(payload: Buffer, signature: string): Promise<void> {
  // 1. Verify signature first — reject invalid requests
  let event: Stripe.Event;
  try {
    event = this.stripeService.constructWebhookEvent(payload, signature);
  } catch {
    throw new BadRequestException('Invalid webhook signature');
  }

  // 2. Idempotency check — skip already-processed events
  const exists = await this.webhookEventRepo.findByStripeEventId(event.id);
  if (exists?.status === 'PROCESSED') return;

  // 3. Store event as PENDING
  const record = await this.webhookEventRepo.create({
    stripeEventId: event.id,
    eventType: event.type,
    status: 'PENDING',
  });

  // 4. Process event
  try {
    await this.processEvent(event);
    await this.webhookEventRepo.update(record.id, { status: 'PROCESSED' });
  } catch (error) {
    await this.webhookEventRepo.update(record.id, {
      status: 'FAILED',
      errorMessage: error.message,
    });
    throw error; // let Stripe retry
  }
}

private async processEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      // Unhandled event — log and ignore
      this.logger.debug(`Unhandled Stripe event: ${event.type}`);
  }
}
```

---

## WEBHOOK EVENT TABLE (Prisma)

```prisma
model WebhookEvent {
  id             String   @id @default(uuid())
  stripeEventId  String   @unique           // prevent duplicates
  eventType      String
  status         String   @default("PENDING") // PENDING | PROCESSED | FAILED
  errorMessage   String?
  processedAt    DateTime?
  createdAt      DateTime @default(now())

  @@index([stripeEventId])
  @@index([status])
  @@map("webhook_events")
}
```

---

## ENV VARIABLES

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

```typescript
// src/config/stripe.config.ts
export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
}));
```

---

## RULES

```
✅ rawBody: true in NestFactory.create() — non-negotiable for webhooks
✅ Always verify webhook signature before processing
✅ Always store processed event IDs (idempotency table)
✅ Webhook endpoint must be @Public() — Stripe sends no JWT
✅ Webhook endpoint must be @SkipThrottle()
✅ Return 200 immediately — process async or synchronously but return fast
✅ Return 200 even on duplicate events — let Stripe think it succeeded
✅ Pin Stripe API version in constructor

❌ Never trust webhook data without signature verification
❌ Never process the same event twice — check idempotency table
❌ Never block the webhook response with slow operations — use queues
❌ Never put STRIPE_SECRET_KEY in code — always ConfigService
```

---

## TEST WEBHOOKS LOCALLY

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward to local NestJS
stripe listen --forward-to localhost:3000/api/v1/billing/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

---

## KEY DOCS

```
Stripe NestJS:       https://stripe.com/docs/api?lang=node
Webhooks:            https://docs.stripe.com/webhooks
Webhook signatures:  https://docs.stripe.com/webhooks#verify-official-libraries
Checkout:            https://docs.stripe.com/payments/checkout
Subscriptions:       https://docs.stripe.com/billing/subscriptions/overview
Stripe CLI:          https://docs.stripe.com/stripe-cli
Testing:             https://docs.stripe.com/testing
```