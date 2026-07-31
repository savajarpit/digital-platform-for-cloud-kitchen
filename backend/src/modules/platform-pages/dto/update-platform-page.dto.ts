import { PartialType } from '@nestjs/swagger';
import { CreatePlatformPageDto } from './create-platform-page.dto';

export class UpdatePlatformPageDto extends PartialType(CreatePlatformPageDto) {}
