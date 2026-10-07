import {
  bucketRevenueByDay,
  sumRevenueSince,
  toRevenueRows,
} from './overview-revenue.util';

// 2 Oct 12:00 IST, 3 Oct 10:00 IST, 3 Oct 16:00 IST.
const rows = toRevenueRows(
  [
    { createdAt: new Date('2026-10-02T06:30:00Z'), totalInPaise: 20000 },
    { createdAt: new Date('2026-10-03T04:30:00Z'), totalInPaise: 15000 },
  ],
  [
    {
      createdAt: new Date('2026-10-03T10:30:00Z'),
      priceInPaiseSnapshot: 100000,
    },
  ],
);

describe('overview revenue', () => {
  it('counts food orders and plan purchases separately in one total', () => {
    expect(sumRevenueSince(rows, new Date('2026-10-03T00:00:00Z'))).toEqual({
      orders: 1,
      plans: 1,
      revenueInPaise: 115000,
    });
  });

  it('buckets by tenant-local day', () => {
    expect(
      bucketRevenueByDay(rows, 'Asia/Kolkata', '2026-10-02', '2026-10-03'),
    ).toEqual([
      { date: '2026-10-02', orders: 1, plans: 0, revenueInPaise: 20000 },
      { date: '2026-10-03', orders: 1, plans: 1, revenueInPaise: 115000 },
    ]);
  });
});
