import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { Express } from 'express';
import 'multer';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
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
    return await this.service.findOne(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Submission created.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('files', undefined, { preservePath: true }))
  async create(
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    if (files.length) {
      const results = await Promise.allSettled(
        files.map((file, index) => {
          const createSubmission = new CreateSubmissionDto();
          createSubmissionDto.type = createSubmissionDto.type;
          if (!createSubmissionDto.name) {
            createSubmission.name = file.originalname;
          } else {
            createSubmission.name = `${createSubmissionDto.name} - ${index}`;
          }

          return this.service.create(createSubmission);
        })
      );
      console.log(results);
      return results;
    } else {
      return await this.service.create(createSubmissionDto);
    }
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Submission deleted successfully.',
    type: Boolean,
  })
  @ApiNotFoundResponse({ description: 'Submission Id not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
