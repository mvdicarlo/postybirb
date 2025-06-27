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
import { ISubmissionDto, SubmissionId, SubmissionType } from '@postybirb/types';
import { parse } from 'path';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { ApplyMultiSubmissionDto } from './dtos/apply-multi-submission.dto';
import { CreateSubmissionDto } from './dtos/create-submission.dto';
import { UpdateSubmissionTemplateNameDto } from './dtos/update-submission-template-name.dto';
import { UpdateSubmissionDto } from './dtos/update-submission.dto';
import { SubmissionService } from './services/submission.service';

/**
 * CRUD operations on Submission data.
 *
 * @class SubmissionController
 */
@ApiTags('submissions')
@Controller('submissions')
export class SubmissionController extends PostyBirbController<'SubmissionSchema'> {
  constructor(readonly service: SubmissionService) {
    super(service);
  }

  @Get()
  async findAll(): Promise<ISubmissionDto[]> {
    return this.service.findAllAsDto();
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Submission created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('files', undefined, { preservePath: true }))
  async create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFiles() files: MulterFileInfo[],
  ) {
    const mapper = (res) => res.toDTO();
    if ((files || []).length) {
      const results = [];
      // !NOTE: Currently this shouldn't be able to happen with the current UI, but may need to be addressed in the future.
      // Efforts have been made to prevent this from happening, with the removal of using entity.create({}) but it may still be possible.
      // There appears to be an issue where if trying to create many submissions in parallel
      // the database will attempt to create them all at once and fail on a race condition.
      // not sure if this is a database issue or a typeorm issue.
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

  @Post('unarchive/:id')
  @ApiOkResponse({ description: 'Submission unarchived.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async unarchive(@Param('id') id: SubmissionId) {
    return this.service.unarchive(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Submission updated.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async update(
    @Param('id') id: SubmissionId,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
  ) {
    return this.service
      .update(id, updateSubmissionDto)
      .then((entity) => entity.toDTO());
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
    @Body() updateSubmissionDto: UpdateSubmissionTemplateNameDto,
  ) {
    return this.service
      .updateTemplateName(id, updateSubmissionDto)
      .then((entity) => entity.toDTO());
  }

  @Patch('apply/multi')
  @ApiOkResponse({ description: 'Submission applied to multiple submissions.' })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async applyMulti(@Body() applyMultiSubmissionDto: ApplyMultiSubmissionDto) {
    return this.service.applyMultiSubmission(applyMultiSubmissionDto);
  }

  @Patch('apply/template/:id/:templateId')
  @ApiOkResponse({ description: 'Template applied to submission.' })
  @ApiNotFoundResponse({ description: 'Submission Id or Template Id not found.' })
  async applyTemplate(
    @Param('id') id: SubmissionId,
    @Param('templateId') templateId: SubmissionId,
  ) {
    return this.service
      .applyOverridingTemplate(id, templateId)
      .then((entity) => entity.toDTO());
  }
}
