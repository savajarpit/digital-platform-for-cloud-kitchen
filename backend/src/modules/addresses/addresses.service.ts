import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '../../generated/prisma';

export interface ServiceabilityResult {
  serviceable: boolean;
  deliveryFeeInPaise?: number;
  minOrderAmountInPaise?: number;
  freeDeliveryAboveAmountInPaise?: number;
}

@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepo: AddressesRepository) {}

  findAll(tenantId: string, userId: string): Promise<Address[]> {
    return this.addressesRepo.findAllForUser(tenantId, userId);
  }

  async findOne(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<Address> {
    const address = await this.addressesRepo.findById(tenantId, userId, id);
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateAddressDto,
  ): Promise<Address> {
    await this.assertPincodeServiceable(tenantId, dto.pincode);
    if (dto.isDefault) {
      await this.addressesRepo.clearDefaultForUser(tenantId, userId);
    }
    return this.addressesRepo.create(tenantId, userId, dto);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressesRepo.findById(tenantId, userId, id);
    if (!address) throw new NotFoundException('Address not found');

    if (dto.pincode) {
      await this.assertPincodeServiceable(tenantId, dto.pincode);
    }
    if (dto.isDefault) {
      await this.addressesRepo.clearDefaultForUser(tenantId, userId, id);
    }
    return this.addressesRepo.update(id, dto);
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const address = await this.addressesRepo.findById(tenantId, userId, id);
    if (!address) throw new NotFoundException('Address not found');
    await this.addressesRepo.delete(id);
  }

  async checkServiceability(
    tenantId: string,
    pincode: string,
  ): Promise<ServiceabilityResult> {
    const record = await this.addressesRepo.findServiceablePincode(
      tenantId,
      pincode,
    );
    if (!record || !record.isActive) return { serviceable: false };
    return {
      serviceable: true,
      deliveryFeeInPaise: record.deliveryFee,
      minOrderAmountInPaise: record.minOrderAmount,
      freeDeliveryAboveAmountInPaise:
        record.freeDeliveryAboveAmount ?? undefined,
    };
  }

  private async assertPincodeServiceable(
    tenantId: string,
    pincode: string,
  ): Promise<void> {
    const result = await this.checkServiceability(tenantId, pincode);
    if (!result.serviceable) {
      throw new BadRequestException(
        `We don't currently deliver to pincode ${pincode}`,
      );
    }
  }
}
