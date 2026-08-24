import { PartialType } from '@nestjs/swagger';
import { CreateKitchenZoneDto } from './create-kitchen-zone.dto';

export class UpdateKitchenZoneDto extends PartialType(CreateKitchenZoneDto) {}
