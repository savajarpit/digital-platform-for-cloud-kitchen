# Razorpay webhooks — setup guide

There are **two independent Razorpay setups** in this platform. They use different accounts, keys,
webhook URLs and webhook secrets, and never affect each other.

| | Platform (you, SUPER_ADMIN) | Tenant (each business) |
|---|---|---|
| What it bills | Businesses paying for their platform plan | Customers paying for food orders and meal-plan subscriptions |
| Razorpay account | Platform's own account | The business's own account |
| Keys stored in | Server env: `PLATFORM_RAZORPAY_KEY_ID`, `PLATFORM_RAZORPAY_KEY_SECRET` | Per tenant, encrypted in DB (Admin → Settings → Payment, or SUPER_ADMIN tenant page) |
| Webhook secret stored in | Server env: `PLATFORM_RAZORPAY_WEBHOOK_SECRET` | Per tenant, the "Webhook secret" field next to the keys |
| Webhook URL | `https://<api-domain>/api/v1/platform/billing/webhook` | `https://<api-domain>/api/v1/payments/webhook` (same URL for every tenant) |
| Webhook needed? | **Required** | **Optional** (recommended) |

## Why they can't interfere

- A Razorpay webhook belongs to one Razorpay account and only sends that account's events. A webhook a
  business adds in *their* dashboard never sees your platform payments, and vice versa.
- Every webhook is signature-checked with its own secret: platform events against
  `PLATFORM_RAZORPAY_WEBHOOK_SECRET`, tenant events against the secret of the tenant that owns the
  order/invoice. A request signed with the wrong secret is rejected (400) and changes nothing.
- All tenants share one URL safely: the server finds the order (or subscription invoice) by its
  Razorpay order id, then verifies the signature with *that* tenant's secret.
- Each event is processed once (deduplicated in `webhook_events`), so Razorpay retries are harmless.

Don't use the platform's Razorpay account as a tenant's payment account. If you do, it still works
(each endpoint ignores events it doesn't own), but both setups then share one account's money and
reports.

## Platform webhook (required)

Platform plan billing uses Razorpay Subscriptions. **Renewals, failed renewals and cancellations only
reach the app through this webhook.** There is no background check for them, so without it a tenant
that stopped paying is never suspended and renewal invoices are never recorded.

Razorpay Dashboard (platform account) → Account & Settings → Webhooks → Add new webhook:

- **URL:** `https://<api-domain>/api/v1/platform/billing/webhook`
- **Secret:** a long random string; put the same value in `PLATFORM_RAZORPAY_WEBHOOK_SECRET`
- **Alert email:** your ops email
- **Events:**

| Event | What the app does |
|---|---|
| `subscription.charged` | Records a PAID platform invoice, extends the period, emails the owner the invoice |
| `subscription.pending` | Records a FAILED invoice, emails the owner and the platform alert email |
| `subscription.halted` | Halts the plan and suspends the tenant |
| `subscription.cancelled` | Marks cancelled (or completes a scheduled downgrade handoff) |
| `subscription.completed` | Marks the plan completed |
| `subscription.activated` | Safety net; activation normally happens in the checkout verify call |
| `subscription.paused`, `subscription.resumed` | Logged only. The app never pauses plans, so this means someone did it on the Razorpay dashboard |

## Tenant webhook (optional, recommended)

A customer's payment is confirmed in three ways, from fastest to slowest:

1. **Browser:** right after paying, the checkout page confirms it (usual case).
2. **Webhook:** Razorpay tells the server within seconds, even if the customer closed the tab.
3. **Payment check job (always on):** every 5 minutes the server asks Razorpay about any online
   payment still pending (3 min – 24 h old) and confirms captured ones. After 24 h unpaid, the
   payment is marked failed.

So a business **without** a webhook never ends up "paid but pending". It can just wait up to
~5 minutes in the rare case the browser step didn't finish. The webhook removes that wait.

Business's Razorpay Dashboard → Account & Settings → Webhooks → Add new webhook:

- **URL:** `https://<api-domain>/api/v1/payments/webhook`
- **Secret:** a long random string
- **Events:**

| Event | What the app does |
|---|---|
| `payment.captured` | Food order → PAID + CONFIRMED, customer notified. Plan payment → invoice PAID, subscription ACTIVE |
| `order.paid` | Same as `payment.captured` (either one is enough; enabling both is fine) |
| `payment.failed` | Food order → payment FAILED (never downgrades an order already PAID). Plan payment → ignored, since the customer can retry |

**Order matters: save the secret in the app first**, then create the webhook in Razorpay. If the
webhook exists but the app doesn't have its secret, every delivery is rejected; Razorpay keeps
retrying and eventually disables the webhook. Payments are still confirmed by the payment check job,
just slower.

## Test mode vs live mode

Razorpay keeps separate webhooks for Test and Live mode. Set up the webhook in each mode you use, and
use the matching keys (`rzp_test_…` / `rzp_live_…`). A test-mode webhook won't fire for live payments.

## Not handled yet

- `refund.processed` / `refund.failed`: refunds are recorded when the admin starts them. Their final
  status in Razorpay isn't tracked. Not needed to enable.
