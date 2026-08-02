import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealSlotType } from '../../../generated/prisma';

export class PlanSlotDto {
  @ApiProperty({ enum: MealSlotType, example: MealSlotType.LUNCH })
  @IsEnum(MealSlotType)
  slotType: MealSlotType;

  @ApiPropertyOptional({
    description:
      'Null/omitted = "meal to be announced" — the slot exists but is not decided yet',
  })
  @IsOptional()
  @IsUUID()
  mealId?: string;
}

export class PlanDayDto {
  @ApiProperty({
    example: 1,
    description: 'Relative day number within the plan, 1-based',
  })
  @IsInt()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    type: [PlanSlotDto],
    description:
      'Only the slots this day actually has — a day with 1 meal only lists one slot',
  })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PlanSlotDto)
  slots: PlanSlotDto[];
}

/** Replaces the whole day/slot tree in one call, matching how a plan-builder
 * form realistically submits "save" once rather than granular per-day CRUD. */
export class UpsertPlanDaysDto {
  @ApiProperty({ type: [PlanDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days: PlanDayDto[];
}
