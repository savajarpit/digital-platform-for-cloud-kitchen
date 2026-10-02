import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bull';
import { PaymentsService } from './payments.service';
import { OrdersRepository } from '../orders/orders.repository';
import { WebhookEventsRepository } from './webhook-events.repository';
import { RazorpayClientService } from '../../shared-modules/razorpay/razorpay-client.service';
import { OrderConfirmedJob } from '../notifications/notifications.processor';

const ordersRepo = {
  findByRazorpayOrderId: jest.fn(),
  markPaid: jest.fn(),
  markFailed: jest.fn(),
};
const razorpay = {
  verifyPaymentSignature: jest.fn(),
  verifyWebhookSignature: jest.fn(),
};
const webhookEvents = {
  findByEventId: jest.fn(),
  create: jest.fn(),
  markProcessed: jest.fn(),
  markFailed: jest.fn(),
};
const queue = { add: jest.fn() };

function build(): PaymentsService {
  return new PaymentsService(
    ordersRepo as unknown as OrdersRepository,
    razorpay as unknown as RazorpayClientService,
    webhookEvents as unknown as WebhookEventsRepository,
    queue as unknown as Queue<OrderConfirmedJob>,
  );
}

const pendingOrder = {
  id: 'o1',
  tenantId: 't1',
  userId: 'u1',
  paymentStatus: 'PENDING',
};
const verifyDto = {
  razorpayOrderId: 'order_1',
  razorpayPaymentId: 'pay_1',
  razorpaySignature: 'sig',
};

function webhookBody(event: string): Buffer {
  return Buffer.from(
    JSON.stringify({
      event,
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
    }),
  );
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = build();
    webhookEvents.findByEventId.mockResolvedValue(null);
    webhookEvents.create.mockResolvedValue({ id: 'e1' });
  });

  afterEach(() => jest.resetAllMocks());

  describe('verifyPayment', () => {
    it('rejects a bad signature on a pending order and does not mark it paid', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue(pendingOrder);
      razorpay.verifyPaymentSignature.mockResolvedValue(false);

      await expect(
        service.verifyPayment('t1', 'u1', verifyDto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ordersRepo.markPaid).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it("404s for someone else's order (other user or other tenant)", async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue(pendingOrder);
      await expect(
        service.verifyPayment('t1', 'u2', verifyDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.verifyPayment('t2', 'u1', verifyDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(razorpay.verifyPaymentSignature).not.toHaveBeenCalled();
    });

    it('is idempotent once paid — no second markPaid or confirmation', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue({
        ...pendingOrder,
        paymentStatus: 'PAID',
      });
      await expect(
        service.verifyPayment('t1', 'u1', verifyDto),
      ).resolves.toEqual({ confirmed: true });
      expect(ordersRepo.markPaid).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('marks a pending order paid on a valid signature', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue(pendingOrder);
      razorpay.verifyPaymentSignature.mockResolvedValue(true);
      await service.verifyPayment('t1', 'u1', verifyDto);
      expect(ordersRepo.markPaid).toHaveBeenCalledWith('o1', 'pay_1');
      expect(queue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleWebhook', () => {
    it('rejects a real order event with an invalid signature', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue(pendingOrder);
      razorpay.verifyWebhookSignature.mockResolvedValue(false);

      await expect(
        service.handleWebhook(webhookBody('payment.captured'), 'bad', 'evt_1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ordersRepo.markPaid).not.toHaveBeenCalled();
    });

    it('does not act on the same event twice', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue(pendingOrder);
      razorpay.verifyWebhookSignature.mockResolvedValue(true);
      webhookEvents.findByEventId.mockResolvedValue({
        id: 'e1',
        status: 'PROCESSED',
      });

      await service.handleWebhook(
        webhookBody('payment.captured'),
        's',
        'evt_1',
      );
      expect(ordersRepo.markPaid).not.toHaveBeenCalled();
    });

    it('a stale payment.failed after capture goes through the PAID-safe markFailed', async () => {
      ordersRepo.findByRazorpayOrderId.mockResolvedValue({
        ...pendingOrder,
        paymentStatus: 'PAID',
      });
      razorpay.verifyWebhookSignature.mockResolvedValue(true);
      ordersRepo.markFailed.mockResolvedValue(false);

      await service.handleWebhook(webhookBody('payment.failed'), 's', 'evt_2');

      expect(ordersRepo.markFailed).toHaveBeenCalledWith('o1');
      expect(webhookEvents.markProcessed).toHaveBeenCalledWith('e1');
    });
  });
});
