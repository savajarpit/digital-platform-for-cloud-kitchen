import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetHomeSectionItemsDto {
  @ApiProperty({
    example: ['b3f1c2a0-...', 'c4a2d3b1-...'],
    description:
      "Meal IDs in display order — replaces the section's full item list",
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  mealIds: string[];
}
