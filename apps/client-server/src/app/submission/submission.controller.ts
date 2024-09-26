import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IEntityDto, SubmissionId, SubmissionType } from '@postybirb/types';
import { parse } from 'path';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { Submission } from '../database/entities';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { CreateSubmissionDto } from './dtos/create-submission.dto';
import { UpdateSubmissionTemplateNameDto } from './dtos/update-submission-template-name.dto';
import { UpdateSubmissionDto } from './dtos/update-submission.dto';
import { SubmissionService } from './services/submission.service';

/**
 * CRUD operations on Submission data.
 *
 * @class SubmissionController
 */
@ApiTags('submission')
@Controller('submission')
export class SubmissionController extends PostyBirbController<Submission> {
  constructor(readonly service: SubmissionService) {
    super(service);
  }

  @Get()
  async findAll(): Promise<IEntityDto[]> {
    return this.service.findAllAsDto();
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Submission created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('files', undefined, { preservePath: true }))
  async create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFiles() files: MulterFileInfo[]
  ) {
    const mapper = (res) => res.toJSON();
    if ((files || []).length) {
      const results = [];
      // TODO - need to reconsider how to queue submission creation up.
      // There appears to be an issue where if trying to create many submissions in parallel
      // the database will attempt to create them all at once and fail on a race condition.
      // not sure if this is a database issue or a typeorm issue.
      // eslint-disable-next-line no-restricted-syntax
      for (const file of files) {
        const createFileSubmission = new CreateSubmissionDto();
        Object.assign(createFileSubmission, createSubmissionDto);
        if (!createSubmissionDto.name) {
          createFileSubmission.name = parse(file.originalname).name;
        }

        createFileSubmission.type = SubmissionType.FILE;
        results.push(await this.service.create(createFileSubmission, file));
      }

      return results.map(mapper);
    }
    return (
      await Promise.all([await this.service.create(createSubmissionDto)])
    ).map(mapper);
  }

  @Post('duplicate/:id')
  @ApiOkResponse({ description: 'Submission duplicated.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async duplicate(@Param('id') id: SubmissionId) {
    this.service.duplicate(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Submission updated.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async update(
    @Param('id') id: SubmissionId,
    @Body() updateSubmissionDto: UpdateSubmissionDto
  ) {
    return this.service
      .update(id, updateSubmissionDto)
      .then((entity) => entity.toJSON());
  }

  @Patch('reorder/:id/:index')
  @ApiOkResponse({ description: 'Submission reordered.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async reorder(@Param('id') id: SubmissionId, @Param('index') index: number) {
    return this.service.reorder(id, index);
  }

  @Patch('template/:id')
  @ApiOkResponse({ description: 'Submission updated.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async updateTemplateName(
    @Param('id') id: SubmissionId,
    @Body() updateSubmissionDto: UpdateSubmissionTemplateNameDto
  ) {
    return this.service
      .updateTemplateName(id, updateSubmissionDto)
      .then((entity) => entity.toJSON());
  }
}
