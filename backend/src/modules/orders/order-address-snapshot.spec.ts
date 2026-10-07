import { withAddressSnapshot } from './orders.repository';

type SnapshotOrder = Parameters<typeof withAddressSnapshot>[0];

const zone = {
  id: 'z1',
  name: 'Nikol',
  pickupAddress: 'NEW counter address',
  lat: 23.1,
  lng: 72.1,
};

function order(overrides: Record<string, unknown>): SnapshotOrder {
  return {
    fulfillmentType: 'DELIVERY',
    address: null,
    pickupKitchenZone: null,
    addressLine1Snapshot: null,
    addressLine2Snapshot: null,
    addressCitySnapshot: null,
    addressStateSnapshot: null,
    addressPincodeSnapshot: null,
    addressContactPhoneSnapshot: null,
    addressLatSnapshot: null,
    addressLngSnapshot: null,
    ...overrides,
  } as unknown as SnapshotOrder;
}

describe('withAddressSnapshot — pickup orders', () => {
  it("shows the pickup point the order was placed with, not the outlet's later edit", () => {
    const result = withAddressSnapshot(
      order({
        fulfillmentType: 'PICKUP',
        pickupKitchenZone: zone,
        addressLine1Snapshot: 'OLD counter address',
        addressLatSnapshot: 23.0,
        addressLngSnapshot: 72.0,
      }),
    ) as unknown as { pickupKitchenZone: typeof zone };

    expect(result.pickupKitchenZone).toMatchObject({
      id: 'z1',
      pickupAddress: 'OLD counter address',
      lat: 23.0,
      lng: 72.0,
    });
  });

  it('keeps the live outlet for a pickup order placed before snapshots', () => {
    const input = order({ fulfillmentType: 'PICKUP', pickupKitchenZone: zone });
    expect(withAddressSnapshot(input)).toEqual({
      ...input,
      planDelivery: null,
    });
  });

  it('still overlays a delivery order’s address as before', () => {
    const result = withAddressSnapshot(
      order({
        address: { id: 'a1', line1: 'Edited later', city: 'X' },
        addressLine1Snapshot: 'Original line',
        addressCitySnapshot: 'Ahmedabad',
      }),
    ) as unknown as { address: { line1: string; city: string } };

    expect(result.address.line1).toBe('Original line');
    expect(result.address.city).toBe('Ahmedabad');
  });
});
