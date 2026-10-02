import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesRepository } from './addresses.repository';

const mockRepo = {
  findById: jest.fn(),
  findServiceablePincode: jest.fn(),
  findActiveKitchenZones: jest.fn(),
};

const address = {
  id: 'a1',
  pincode: '382350',
  lat: null,
  lng: null,
};

describe('AddressesService.findDeliverableOne', () => {
  let service: AddressesService;

  beforeEach(() => {
    service = new AddressesService(mockRepo as unknown as AddressesRepository);
    mockRepo.findActiveKitchenZones.mockResolvedValue([]);
  });

  afterEach(() => jest.resetAllMocks());

  it("returns the customer's address when its pincode is served", async () => {
    mockRepo.findById.mockResolvedValue(address);
    mockRepo.findServiceablePincode.mockResolvedValue({
      isActive: true,
      deliveryFee: 0,
      minOrderAmount: 0,
      freeDeliveryAboveAmount: null,
    });

    await expect(service.findDeliverableOne('t1', 'u1', 'a1')).resolves.toBe(
      address,
    );
    expect(mockRepo.findById).toHaveBeenCalledWith('t1', 'u1', 'a1');
  });

  it('rejects an address outside the delivery area', async () => {
    mockRepo.findById.mockResolvedValue({ ...address, pincode: '380009' });
    mockRepo.findServiceablePincode.mockResolvedValue(null);

    await expect(service.findDeliverableOne('t1', 'u1', 'a1')).rejects.toThrow(
      new BadRequestException("We don't currently deliver to pincode 380009"),
    );
  });

  it("rejects an address that isn't the customer's", async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.findDeliverableOne('t1', 'u1', 'someone-elses'),
    ).rejects.toThrow(NotFoundException);
    expect(mockRepo.findServiceablePincode).not.toHaveBeenCalled();
  });
});
