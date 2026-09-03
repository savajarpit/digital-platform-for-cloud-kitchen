import { Injectable } from '@nestjs/common';
import { PlatformSettingsRepository } from './platform-settings.repository';

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly repo: PlatformSettingsRepository) {}

  getSettings() {
    return this.repo.findOrCreate();
  }

  update(dto: { whatsappOtpEnabled?: boolean }, userId: string) {
    return this.repo.update({ ...dto, updatedByUserId: userId });
  }

  /** The one thing NotificationsService actually needs — kept as its own
   * method so a caller that only cares about this doesn't need to know the
   * shape of the whole settings row. */
  async isWhatsAppOtpEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.whatsappOtpEnabled;
  }
}
