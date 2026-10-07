import {
  PaymentReconciliationService,
  RECONCILE_MAX_AGE_MS,
  RECONCILE_MIN_AGE_MS,
} from './payment-reconciliation.service';

const ordersRepo = {
  findPendingRazorpayOrders: jest.fn(),
  markStaleRazorpayOrdersFailed: jest.fn(),
};
const subscriptions = {
  findPendingRazorpayInvoices: jest.fn(),
  confirmInvoicePayment: jest.fn(),
  markStaleInvoicesFailed: jest.fn(),
};
const razorpay = { findCapturedPaymentId: jest.fn() };
const payments = { confirmOrderPayment: jest.fn() };
const jobRunner = { run: jest.fn() };

const NOW = new Date('2026-10-02T12:00:00.000Z');

describe('PaymentReconciliationService.reconcile', () => {
  let service: PaymentReconciliationService;

  beforeEach(() => {
    service = new PaymentReconciliationService(
      ordersRepo as never,
      subscriptions as never,
      razorpay as never,
      payments as never,
      jobRunner as never,
    );
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
    ordersRepo.findPendingRazorpayOrders.mockResolvedValue([]);
    subscriptions.findPendingRazorpayInvoices.mockResolvedValue([]);
    ordersRepo.markStaleRazorpayOrdersFailed.mockResolvedValue(0);
    subscriptions.markStaleInvoicesFailed.mockResolvedValue(0);
  });

  afterEach(() => jest.resetAllMocks());

  it('only looks at payments 3 min – 24 h old, and abandons older ones', async () => {
    await service.reconcile(NOW);

    const from = new Date(NOW.getTime() - RECONCILE_MAX_AGE_MS);
    const to = new Date(NOW.getTime() - RECONCILE_MIN_AGE_MS);
    expect(ordersRepo.findPendingRazorpayOrders).toHaveBeenCalledWith(
      from,
      to,
      50,
    );
    expect(ordersRepo.markStaleRazorpayOrdersFailed).toHaveBeenCalledWith(from);
    expect(subscriptions.markStaleInvoicesFailed).toHaveBeenCalledWith(from);
    expect(razorpay.findCapturedPaymentId).not.toHaveBeenCalled();
  });

  it('confirms a captured order and leaves an uncaptured one pending', async () => {
    ordersRepo.findPendingRazorpayOrders.mockResolvedValue([
      { id: 'o1', tenantId: 't1', razorpayOrderId: 'order_1' },
      { id: 'o2', tenantId: 't1', razorpayOrderId: 'order_2' },
    ]);
    razorpay.findCapturedPaymentId
      .mockResolvedValueOnce('pay_1')
      .mockResolvedValueOnce(null);

    const summary = await service.reconcile(NOW);

    expect(payments.confirmOrderPayment).toHaveBeenCalledTimes(1);
    expect(payments.confirmOrderPayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'o1' }),
      'pay_1',
    );
    expect(summary).toMatchObject({ ordersChecked: 2, ordersConfirmed: 1 });
  });

  it('activates a paid subscription invoice', async () => {
    const invoice = {
      id: 'inv1',
      tenantId: 't1',
      subscriptionId: 's1',
      razorpayOrderId: 'order_sub',
    };
    subscriptions.findPendingRazorpayInvoices.mockResolvedValue([invoice]);
    razorpay.findCapturedPaymentId.mockResolvedValue('pay_9');
    subscriptions.confirmInvoicePayment.mockResolvedValue(true);

    const summary = await service.reconcile(NOW);

    expect(subscriptions.confirmInvoicePayment).toHaveBeenCalledWith(
      invoice,
      'pay_9',
    );
    expect(summary).toMatchObject({ invoicesChecked: 1, invoicesConfirmed: 1 });
  });

  it('counts a Razorpay lookup failure and carries on', async () => {
    ordersRepo.findPendingRazorpayOrders.mockResolvedValue([
      { id: 'o1', tenantId: 't1', razorpayOrderId: 'order_1' },
      { id: 'o2', tenantId: 't2', razorpayOrderId: 'order_2' },
    ]);
    razorpay.findCapturedPaymentId
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('pay_2');

    const summary = await service.reconcile(NOW);

    expect(summary).toMatchObject({ lookupErrors: 1, ordersConfirmed: 1 });
  });
});
