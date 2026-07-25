import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PublicConfigResponseDto } from './dto/public-config-response.dto';

@ApiTags('settings')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public-config')
  @ResponseMessage('Public config retrieved successfully')
  @ApiOperation({ summary: 'Get the storefront branding/theme/locale config' })
  @ApiResponse({ status: 200, type: PublicConfigResponseDto })
  getPublicConfig() {
    return this.settingsService.getPublicConfig();
  }
}
