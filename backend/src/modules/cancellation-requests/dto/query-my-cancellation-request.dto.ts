import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryOrderCancellationStatusDto {
  @ApiProperty({ example: 'b3f1c2a0-...' })
  @IsUUID()
  orderId: string;
}
