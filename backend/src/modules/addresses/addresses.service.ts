import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '../../generated/prisma';
import { haversineDistanceMeters } from '../../common/utils/geo.util';

export interface ServiceabilityResult {
  serviceable: boolean;
  deliveryFeeInPaise?: number;
  minOrderAmountInPaise?: number;
  freeDeliveryAboveAmountInPaise?: number;
}

export interface ServiceabilityQuery {
  pincode?: string;
  lat?: number;
  lng?: number;
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
    await this.assertServiceable(tenantId, {
      pincode: dto.pincode,
      lat: dto.lat,
      lng: dto.lng,
    });
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

    if (dto.pincode || (dto.lat !== undefined && dto.lng !== undefined)) {
      await this.assertServiceable(tenantId, {
        pincode: dto.pincode ?? address.pincode,
        lat: dto.lat,
        lng: dto.lng,
      });
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
    query: ServiceabilityQuery,
  ): Promise<ServiceabilityResult> {
    const geoResult = await this.checkGeoServiceability(tenantId, query);
    if (geoResult) return geoResult;

    if (!query.pincode) return { serviceable: false };

    const record = await this.addressesRepo.findServiceablePincode(
      tenantId,
      query.pincode,
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

  /**
   * Returns a result only when the tenant has geo-radius mode fully
   * configured (kitchen location + radius) AND the caller supplied a
   * lat/lng — otherwise returns null so checkServiceability falls back to
   * the pincode table. This is the "geo primary, pincode fallback" mode:
   * lets tenants migrate to real geo-radius serviceability gradually.
   */
  private async checkGeoServiceability(
    tenantId: string,
    query: ServiceabilityQuery,
  ): Promise<ServiceabilityResult | null> {
    if (query.lat === undefined || query.lng === undefined) return null;

    const geo = await this.addressesRepo.findKitchenGeoSettings(tenantId);
    if (
      !geo ||
      geo.kitchenLat === null ||
      geo.kitchenLng === null ||
      geo.deliveryRadiusMeters === null
    ) {
      return null;
    }

    const distanceMeters = haversineDistanceMeters(
      geo.kitchenLat,
      geo.kitchenLng,
      query.lat,
      query.lng,
    );
    if (distanceMeters > geo.deliveryRadiusMeters) {
      return { serviceable: false };
    }

    return {
      serviceable: true,
      deliveryFeeInPaise: geo.deliveryFee ?? 0,
      minOrderAmountInPaise: geo.minOrderAmount ?? 0,
      freeDeliveryAboveAmountInPaise: geo.freeDeliveryAboveAmount ?? undefined,
    };
  }

  private async assertServiceable(
    tenantId: string,
    query: ServiceabilityQuery,
  ): Promise<void> {
    const result = await this.checkServiceability(tenantId, query);
    if (!result.serviceable) {
      throw new BadRequestException(
        query.pincode
          ? `We don't currently deliver to pincode ${query.pincode}`
          : `We don't currently deliver to this location`,
      );
    }
  }
}
