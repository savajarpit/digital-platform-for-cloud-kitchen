import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformPagesService } from './platform-pages.service';
import { CreatePlatformPageDto } from './dto/create-platform-page.dto';
import { UpdatePlatformPageDto } from './dto/update-platform-page.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('platform-pages')
@Controller({ path: 'platform-pages', version: '1' })
export class PlatformPagesController {
  constructor(private readonly platformPagesService: PlatformPagesService) {}

  @Public()
  @Get()
  @ResponseMessage('Platform pages retrieved successfully')
  @ApiOperation({ summary: "List Arpit's own published platform pages" })
  findPublished() {
    return this.platformPagesService.findPublished();
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('admin')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Platform pages retrieved successfully')
  @ApiOperation({
    summary:
      'SUPER_ADMIN-only: list every platform page, including unpublished',
  })
  findAllForAdmin() {
    return this.platformPagesService.findAll();
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  @ApiBearerAuth('access-token')
  @ResponseMessage('Platform page created successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: create a platform page' })
  create(@Body() dto: CreatePlatformPageDto) {
    return this.platformPagesService.create(dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ResponseMessage('Platform page updated successfully')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: update a platform page' })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformPageDto) {
    return this.platformPagesService.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'SUPER_ADMIN-only: delete a platform page' })
  async remove(@Param('id') id: string) {
    await this.platformPagesService.remove(id);
  }

  // Must come last — a dynamic :slug segment would otherwise swallow "admin".
  @Public()
  @Get(':slug')
  @ResponseMessage('Platform page retrieved successfully')
  @ApiOperation({ summary: 'Get a single published platform page by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.platformPagesService.findPublishedBySlug(slug);
  }
}
