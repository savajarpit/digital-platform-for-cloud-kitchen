import { BadRequestException } from '@nestjs/common';

export interface PlanTextFields {
  name?: string;
  description?: string | null;
  features?: string[];
}

/**
 * The customer-facing text of a plan, cleaned up before it's saved: the
 * name trimmed (blank is refused), a blank description stored as null, and
 * blank feature bullets dropped — an empty bullet renders as a stray tick on
 * the plan card. Only the fields present are returned, so a PATCH leaves the
 * rest alone.
 */
export function normalizePlanText(fields: PlanTextFields): PlanTextFields {
  const result: PlanTextFields = {};
  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (!name) throw new BadRequestException('Give the plan a name.');
    result.name = name;
  }
  if (fields.description !== undefined) {
    result.description = fields.description?.trim() || null;
  }
  if (fields.features !== undefined) {
    result.features = fields.features.map((f) => f.trim()).filter(Boolean);
  }
  return result;
}
