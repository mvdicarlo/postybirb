import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TagConvertersService } from './tag-converters.service';

/**
 * CRUID operations on TagConverters
 * @class TagConvertersController
 */
@ApiTags('tag-converters')
@Controller('tag-converters')
export class TagConvertersController {
  constructor(private readonly service: TagConvertersService) {}
}
