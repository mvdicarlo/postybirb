import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId, IFileBuffer } from '@postybirb/types';
import { SubmissionFile } from '../drizzle/models';
import { FileService } from './file.service';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Get(':fileTarget/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getThumbnail(
    @Param('fileTarget') fileTarget: 'file' | 'thumbnail' | 'alt',
    @Param('id') id: EntityId,
    @Res() response,
  ) {
    const submissionFile = await this.service.findFile(id);
    await submissionFile.load(fileTarget);
    const imageProvidingEntity = this.getFileBufferForTarget(
      fileTarget,
      submissionFile,
    );
    if (!imageProvidingEntity) {
      throw new BadRequestException(`No ${fileTarget} found for file ${id}`);
    }
    response.contentType(imageProvidingEntity.mimeType);
    response.send(imageProvidingEntity.buffer);
  }

  private getFileBufferForTarget(
    fileTarget: 'file' | 'thumbnail' | 'alt',
    submissionFile: SubmissionFile,
  ): IFileBuffer | undefined {
    switch (fileTarget) {
      case 'file':
        return submissionFile.file;
      case 'thumbnail':
        return submissionFile.thumbnail;
      case 'alt':
        return submissionFile.altFile;
      default:
        throw new BadRequestException('Invalid file target');
    }
  }
}
