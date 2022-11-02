import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubmissionType } from '@postybirb/types';
import { DeleteQuery } from '../../common/service/modifiers/delete-query';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { SubmissionDto } from '../dtos/submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { SubmissionService } from '../services/submission.service';

/**
 * CRUD operations on Submission data.
 *
 * @class SubmissionController
 */
@ApiTags('submission')
@Controller('submission')
export class SubmissionController {
  constructor(private readonly service: SubmissionService) {}

  @Get(':id')
  @ApiOkResponse({ description: 'The requested Submission.' })
  @ApiNotFoundResponse({ description: 'Submission not found.' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get()
  @ApiOkResponse({ description: 'A list of all submission records.' })
  findAll() {
    return this.service.findAllAsDto(SubmissionDto);
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
    const mapper = (res) => {
      const obj = res.toJSON();
      return obj;
    };
    if (files.length) {
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

  @Patch()
  @ApiOkResponse({ description: 'Submission updated.', type: Boolean })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  update(@Body() updateSubmissionDto: UpdateSubmissionDto) {
    return this.service.update(updateSubmissionDto);
  }

  @Delete()
  @ApiOkResponse({
    description: 'Submission deleted successfully.',
    type: Boolean,
  })
  async remove(@Query() query: DeleteQuery) {
    return DeleteQuery.execute(query, this.service);
  }

  @Post('file/add/:id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'File appended.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('file', undefined, { preservePath: true }))
  async appendFile(
    @Param('id') id: string,
    @UploadedFile() file: MulterFileInfo
  ) {
    return this.service.appendFile(id, file);
  }

  @Post('file/replace/:id/:fileId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'File replaced.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('file', undefined, { preservePath: true }))
  async replaceFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @UploadedFile() file: MulterFileInfo
  ) {
    return this.service.replaceFile(id, fileId, file);
  }

  @Post('thumbnail/add/:id/:fileId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Thumbnail file appended.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('file', undefined, { preservePath: true }))
  async appendThumbnail(
    @Param('id') id: string,
    @UploadedFile() file: MulterFileInfo
  ) {
    return this.service.appendThumbnail(id, file);
  }

  @Post('thumbnail/append/:id/:fileId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Thumbnail file replaced.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('file', undefined, { preservePath: true }))
  async replaceThumbnail(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @UploadedFile() file: MulterFileInfo
  ) {
    return this.service.replaceThumbnail(id, fileId, file);
  }

  @Delete('file/remove/:id/:fileId')
  @ApiOkResponse({ description: 'File removed.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  async removeFile(@Param('id') id: string, @Param('fileId') fileId: string) {
    return this.service.removeFile(id, fileId);
  }
}
