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

  /**
   * OR, not override: geo-radius and the pincode list are two independent
   * ways to be serviceable, not a priority chain — a location only needs to
   * match one. Lets a tenant cover their main radius by geo-distance while
   * adding extra pincode "pockets" further out (or vice versa), instead of
   * geo-radius silently shadowing every pincode entry once it's configured.
   */
  async checkServiceability(
    tenantId: string,
    query: ServiceabilityQuery,
  ): Promise<ServiceabilityResult> {
    const geoResult = await this.checkGeoServiceability(tenantId, query);
    if (geoResult?.serviceable) return geoResult;

    if (query.pincode) {
      const record = await this.addressesRepo.findServiceablePincode(
        tenantId,
        query.pincode,
      );
      if (record?.isActive) {
        return {
          serviceable: true,
          deliveryFeeInPaise: record.deliveryFee,
          minOrderAmountInPaise: record.minOrderAmount,
          freeDeliveryAboveAmountInPaise:
            record.freeDeliveryAboveAmount ?? undefined,
        };
      }
    }

    return geoResult ?? { serviceable: false };
  }

  /**
   * Returns a result only when the tenant has at least one active kitchen
   * zone AND the caller supplied a lat/lng — otherwise returns null so
   * checkServiceability falls back to the pincode table. A tenant can have
   * several outlets; a location is serviceable if it falls within ANY
   * active zone's radius — when more than one matches, the nearest zone's
   * fee/min-order/free-delivery terms win, since that's the outlet that
   * would realistically fulfill the order.
   */
  private async checkGeoServiceability(
    tenantId: string,
    query: ServiceabilityQuery,
  ): Promise<ServiceabilityResult | null> {
    if (query.lat === undefined || query.lng === undefined) return null;

    const zones = await this.addressesRepo.findActiveKitchenZones(tenantId);
    if (zones.length === 0) return null;

    let nearestMatch: {
      zone: (typeof zones)[number];
      distanceMeters: number;
    } | null = null;
    for (const zone of zones) {
      const distanceMeters = haversineDistanceMeters(
        zone.lat,
        zone.lng,
        query.lat,
        query.lng,
      );
      if (distanceMeters > zone.radiusMeters) continue;
      if (!nearestMatch || distanceMeters < nearestMatch.distanceMeters) {
        nearestMatch = { zone, distanceMeters };
      }
    }

    if (!nearestMatch) return { serviceable: false };

    const { zone } = nearestMatch;
    return {
      serviceable: true,
      deliveryFeeInPaise: zone.deliveryFee,
      minOrderAmountInPaise: zone.minOrderAmount,
      freeDeliveryAboveAmountInPaise: zone.freeDeliveryAboveAmount ?? undefined,
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
