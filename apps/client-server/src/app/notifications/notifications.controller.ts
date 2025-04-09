import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { CreateNotificationDto } from './dtos/create-notification.dto';
import { UpdateNotificationDto } from './dtos/update-notification.dto';
import { NotificationsService } from './notifications.service';

/**
 * @class NotificationsController
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(readonly service: NotificationsService) {}

  @Post()
  @ApiOkResponse({ description: 'Notification created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  create(@Body() createDto: CreateNotificationDto) {
    return this.service.create(createDto).then((entity) => entity.toDTO());
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Notification updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Notification not found.' })
  update(@Param('id') id: EntityId, @Body() updateDto: UpdateNotificationDto) {
    return this.service.update(id, updateDto).then((entity) => entity.toDTO());
  }

  @Get()
  @ApiOkResponse({ description: 'A list of all records.' })
  findAll() {
    return this.service
      .findAll()
      .then((records) => records.map((record) => record.toDTO()));
  }
}
