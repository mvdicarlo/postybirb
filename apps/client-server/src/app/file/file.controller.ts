import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Express } from 'express';
import 'multer';
import { FileService } from './file.service';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Get('entity/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  getFile(@Param('id') id: string) {
    return this.service.findFile(id);
  }

  @Get('thumbnail/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  getThumbnail(@Param('id') id: string) {
    return this.service.findFile(id);
  }

  @Post('upload')
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
  @UseInterceptors(FilesInterceptor('files', undefined, { preservePath: true }))
  async uploadFile(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await Promise.all(
      files.map((file) => this.service.create(file))
    );

    return await Promise.all(
      results.map((file) => this.service.findFile(file.id))
    );
  }
}
