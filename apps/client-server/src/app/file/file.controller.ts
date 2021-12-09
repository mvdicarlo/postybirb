import {
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

  @Delete(':id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  delete(@Param('id') id: string) {
    return this.service.remove(id);
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
