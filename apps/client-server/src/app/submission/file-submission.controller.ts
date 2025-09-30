import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  EntityId,
  SubmissionFileMetadata,
  SubmissionId,
} from '@postybirb/types';
import { MulterFileInfo } from '../file/models/multer-file-info';
import { ReorderSubmissionFilesDto } from './dtos/reorder-submission-files.dto';
import { UpdateAltFileDto } from './dtos/update-alt-file.dto';
import { FileSubmissionService } from './services/file-submission.service';
import { SubmissionService } from './services/submission.service';

type Target = 'file' | 'thumbnail';

/**
 * Specific REST operations for File Submissions.
 * i.e. as thumbnail changes.
 * @class FileSubmissionController
 */
@ApiTags('file-submission')
@Controller('file-submission')
export class FileSubmissionController {
  constructor(
    private service: FileSubmissionService,
    private submissionService: SubmissionService,
  ) {}

  private findOne(id: SubmissionId) {
    return this.submissionService.findById(id).then((record) => record.toDTO());
  }

  @Post('add/:target/:id')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'File appended.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FilesInterceptor('files', undefined, { preservePath: true }))
  async appendFile(
    @Param('target') target: Target,
    @Param('id') id: SubmissionId,
    @UploadedFiles() files: MulterFileInfo[],
  ) {
    switch (target) {
      case 'file':
        await Promise.all(
          files.map((file) => this.service.appendFile(id, file)),
        );
        break;
      case 'thumbnail':
      default:
        throw new BadRequestException(`Unsupported add target '${target}'`);
    }

    return this.findOne(id);
  }

  @Post('replace/:target/:id/:fileId')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'File replaced.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  @UseInterceptors(FileInterceptor('file', { preservePath: true }))
  async replaceFile(
    @Param('target') target: Target,
    @Param('id') id: SubmissionId,
    @Param('fileId') fileId: EntityId,
    @UploadedFile() file: MulterFileInfo,
  ) {
    switch (target) {
      case 'file':
        await this.service.replaceFile(id, fileId, file);
        break;
      case 'thumbnail':
        await this.service.replaceThumbnail(id, fileId, file);
        break;
      default:
        throw new BadRequestException(`Unsupported replace target '${target}'`);
    }

    return this.findOne(id);
  }

  @Delete('remove/:target/:id/:fileId')
  @ApiOkResponse({ description: 'File removed.' })
  @ApiBadRequestResponse({ description: 'Bad request made.' })
  async removeFile(
    @Param('target') target: Target,
    @Param('id') id: SubmissionId,
    @Param('fileId') fileId: EntityId,
  ) {
    switch (target) {
      case 'file':
        await this.service.removeFile(id, fileId);
        break;
      case 'thumbnail':
      default:
        throw new BadRequestException(`Unsupported remove target '${target}'`);
    }

    return this.findOne(id);
  }

  @Get('alt/:id')
  @ApiOkResponse({ description: 'Alt File Text.' })
  async getAltFileText(@Param('id') id: EntityId) {
    return this.service.getAltFileText(id);
  }

  @Patch('alt/:id')
  @ApiOkResponse({ description: 'Updated Alt File Text.' })
  async updateAltFileText(
    @Param('id') id: EntityId,
    @Body() update: UpdateAltFileDto,
  ) {
    return this.service.updateAltFileText(id, update);
  }

  @Patch('metadata/:id')
  @ApiOkResponse({ description: 'Updated Metadata.' })
  async updateMetadata(
    @Param('id') id: EntityId,
    @Body() update: SubmissionFileMetadata,
  ) {
    return this.service.updateMetadata(id, update);
  }

  @Patch('reorder')
  @ApiOkResponse({ description: 'Files reordered.' })
  async reorderFiles(@Body() update: ReorderSubmissionFilesDto) {
    return this.service.reorderFiles(update);
  }
}
