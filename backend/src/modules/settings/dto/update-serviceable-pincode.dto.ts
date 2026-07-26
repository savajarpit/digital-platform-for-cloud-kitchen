import { PartialType } from '@nestjs/swagger';
import { CreateServiceablePincodeDto } from './create-serviceable-pincode.dto';

export class UpdateServiceablePincodeDto extends PartialType(
  CreateServiceablePincodeDto,
) {}
