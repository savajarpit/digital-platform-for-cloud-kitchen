import { BadRequestException, Injectable } from '@nestjs/common';
import { MealStockRepository } from './meal-stock.repository';
import { DateUtil } from '../../common/utils/date.util';
import {
  STOCK_HOLD_MINUTES,
  StockLimitedMeal,
  findStockShortfall,
  remainingStock,
  stockShortfallMessage,
} from './meal-stock.util';

/**
 * Petpooja-style daily stock: `Meal.dailyQuantityLimit` is how many plates
 * the kitchen makes per delivery date. Nothing is stored or decremented —
 * the remaining count is always derived from that date's live orders, so
 * it "resets" at midnight on its own and a cancelled order frees its
 * plates instantly. A meal with no limit is unlimited.
 */
@Injectable()
export class MealStockService {
  constructor(private readonly stockRepo: MealStockRepository) {}

  async getTenantToday(tenantId: string): Promise<string> {
    const timezone = await this.stockRepo.findTenantTimezone(tenantId);
    return DateUtil.getTenantNow(timezone).dateStr;
  }

  /** Remaining plates for `dateStr`, only for meals that have a limit. */
  async getRemaining(
    tenantId: string,
    meals: StockLimitedMeal[],
    dateStr: string,
  ): Promise<Map<string, number>> {
    const limited = meals.filter((meal) => meal.dailyQuantityLimit !== null);
    const sold = await this.soldFor(tenantId, limited, dateStr);
    return new Map(
      limited.map((meal) => [
        meal.id,
        remainingStock(meal.dailyQuantityLimit!, sold.get(meal.id) ?? 0),
      ]),
    );
  }

  /** Throws a customer-readable 400 when the cart wants more of any meal
   * than `dateStr` still has. */
  async assertAvailable(
    tenantId: string,
    meals: StockLimitedMeal[],
    requested: { mealId: string | null; quantity: number }[],
    dateStr: string,
  ): Promise<void> {
    const limited = meals.filter((meal) => meal.dailyQuantityLimit !== null);
    if (limited.length === 0) return;
    const sold = await this.soldFor(tenantId, limited, dateStr);
    const shortfall = findStockShortfall(
      requested.filter(
        (item): item is { mealId: string; quantity: number } =>
          item.mealId !== null,
      ),
      limited,
      sold,
    );
    if (shortfall) {
      throw new BadRequestException(stockShortfallMessage(shortfall, dateStr));
    }
  }

  private soldFor(
    tenantId: string,
    meals: StockLimitedMeal[],
    dateStr: string,
  ): Promise<Map<string, number>> {
    return this.stockRepo.sumSoldForDate(
      tenantId,
      meals.map((meal) => meal.id),
      dateStr,
      DateUtil.addMinutes(new Date(), -STOCK_HOLD_MINUTES),
    );
  }
}
