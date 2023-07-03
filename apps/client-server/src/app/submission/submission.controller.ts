import {
  Body,
  Controller,
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
import { SubmissionType } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { Submission } from '../database/entities';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { CreateSubmissionDto } from './dtos/create-submission.dto';
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
      const results = await Promise.all(
        files.map((file, index) => {
          const createFileSubmission = new CreateSubmissionDto();
          Object.assign(createFileSubmission, createSubmissionDto);
          if (!createSubmissionDto.name) {
            createFileSubmission.name = file.originalname;
          } else {
            createFileSubmission.name = `${createSubmissionDto.name} - ${index}`;
          }

          createFileSubmission.type = SubmissionType.FILE;
          return this.service.create(createFileSubmission, file);
        })
      );

      return results.map(mapper);
    }
    return (
      await Promise.all([await this.service.create(createSubmissionDto)])
    ).map(mapper);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Submission updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSubmissionDto: UpdateSubmissionDto
  ) {
    return this.service
      .update(id, updateSubmissionDto)
      .then((entity) => entity.toJSON());
  }
}
