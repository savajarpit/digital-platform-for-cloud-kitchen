import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import {
  emailTakenMessage,
  REMOVED_ACCOUNT_EMAIL_MESSAGE,
} from './email-taken.util';
import { UsersRepository } from './users.repository';
import { CustomerInviteService } from './customer-invite.service';
import { AddressesService } from '../addresses/addresses.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateAddressDto } from '../addresses/dto/create-address.dto';
import { HashUtil } from '../../common/utils/hash.util';

const mockUsersRepo = {
  findByEmailIncludingRemoved: jest.fn(),
  create: jest.fn(),
  findCustomerById: jest.fn(),
};
const mockAddresses = { createOnBehalf: jest.fn() };
const mockInvites = { sendInvite: jest.fn(), isPending: jest.fn() };

function build(): AdminCustomersService {
  return new AdminCustomersService(
    mockUsersRepo as unknown as UsersRepository,
    mockAddresses as unknown as AddressesService,
    mockInvites as unknown as CustomerInviteService,
  );
}

const address: CreateAddressDto = {
  contactPhone: '+919123456780',
  line1: '12 MG Road',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pincode: '380001',
  lat: 23.02,
  lng: 72.57,
};

const dto: CreateCustomerDto = {
  email: 'priya@example.com',
  firstName: 'Priya',
  phone: '+919123456780',
};

describe('AdminCustomersService', () => {
  let service: AdminCustomersService;
  let hashSpy: jest.SpyInstance;

  beforeEach(() => {
    service = build();
    hashSpy = jest.spyOn(HashUtil, 'hash').mockResolvedValue('hashed');
    mockUsersRepo.create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ id: 'u1', tenantId: 't1', ...data }),
    );
  });

  afterEach(() => jest.restoreAllMocks());
  afterEach(() => jest.resetAllMocks());

  describe('createCustomer', () => {
    it('rejects an email already used in this tenant', async () => {
      mockUsersRepo.findByEmailIncludingRemoved.mockResolvedValue({
        id: 'existing',
      });
      await expect(service.createCustomer('t1', dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockUsersRepo.create).not.toHaveBeenCalled();
    });

    it("says so when the email is a staff member's, not a customer's", async () => {
      mockUsersRepo.findByEmailIncludingRemoved.mockResolvedValue({
        id: 'owner',
        role: 'OWNER',
      });
      await expect(service.createCustomer('t1', dto)).rejects.toThrow(
        'This email belongs to a staff account here — use a different email for the customer.',
      );
    });

    it('always creates a verified CUSTOMER in the admin tenant, with an unknown password', async () => {
      mockUsersRepo.findByEmailIncludingRemoved.mockResolvedValue(null);
      // Extra fields a client might smuggle past the DTO type.
      const smuggled = {
        ...dto,
        role: 'OWNER',
        tenantId: 'other-tenant',
        password: 'known',
      } as unknown as CreateCustomerDto;

      await service.createCustomer('t1', smuggled);

      const [data] = mockUsersRepo.create.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(data.role).toBe('CUSTOMER');
      expect(data.tenant).toEqual({ connect: { id: 't1' } });
      expect(data.verifiedAt).toBeInstanceOf(Date);
      expect(data.passwordHash).toBe('hashed');
      expect(hashSpy).not.toHaveBeenCalledWith('known');
      expect(data).not.toHaveProperty('password');
    });

    it('sends the invite by default and skips it when sendInvite is false', async () => {
      mockUsersRepo.findByEmailIncludingRemoved.mockResolvedValue(null);

      await service.createCustomer('t1', dto);
      expect(mockInvites.sendInvite).toHaveBeenCalledTimes(1);

      await service.createCustomer('t1', { ...dto, sendInvite: false });
      expect(mockInvites.sendInvite).toHaveBeenCalledTimes(1);
    });

    it('saves the first address as the default for the new customer', async () => {
      mockUsersRepo.findByEmailIncludingRemoved.mockResolvedValue(null);
      mockAddresses.createOnBehalf.mockResolvedValue({ id: 'a1' });

      const result = await service.createCustomer('t1', { ...dto, address });

      expect(mockAddresses.createOnBehalf).toHaveBeenCalledWith('t1', 'u1', {
        ...address,
        isDefault: true,
      });
      expect(result.address).toEqual({ id: 'a1' });
    });
  });

  describe('resendInvite / addAddress', () => {
    it('404s for a customer outside this tenant (or not a customer)', async () => {
      mockUsersRepo.findCustomerById.mockResolvedValue(null);
      await expect(service.resendInvite('t1', 'u9')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        service.addAddress('t1', 'u9', address),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockUsersRepo.findCustomerById).toHaveBeenCalledWith('t1', 'u9');
      expect(mockInvites.sendInvite).not.toHaveBeenCalled();
      expect(mockAddresses.createOnBehalf).not.toHaveBeenCalled();
    });

    it('refuses to add an address to a deactivated customer', async () => {
      mockUsersRepo.findCustomerById.mockResolvedValue({
        id: 'u1',
        isActive: false,
      });
      await expect(
        service.addAddress('t1', 'u1', address),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('adds the address for an active customer of this tenant', async () => {
      mockUsersRepo.findCustomerById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      });
      await service.addAddress('t1', 'u1', address);
      expect(mockAddresses.createOnBehalf).toHaveBeenCalledWith(
        't1',
        'u1',
        address,
      );
    });
  });
});

describe('emailTakenMessage', () => {
  it('is null for a free email', () => {
    expect(emailTakenMessage(null, 'signup')).toBeNull();
  });

  it("explains a removed account's email instead of crashing", () => {
    for (const context of ['customer', 'signup', 'staff'] as const) {
      expect(
        emailTakenMessage({ role: 'CUSTOMER', deletedAt: new Date() }, context),
      ).toBe(REMOVED_ACCOUNT_EMAIL_MESSAGE);
    }
  });
});
