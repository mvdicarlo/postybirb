import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
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
import { IFileBuffer } from '@postybirb/types';
import { getType } from 'mime';
import { FileService } from './file.service';
import { MulterFileInfo } from './models/multer-file-info';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Get('thumbnail/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getThumbnail(@Param('id') id: string, @Res() response) {
    const file = await this.service.findFile(id, ['thumbnail']);
    let imageProvidingEntity: IFileBuffer | null = null;
    if (file.thumbnail) {
      imageProvidingEntity = file.thumbnail;
    }
    response.contentType(imageProvidingEntity.mimeType);
    response.send(imageProvidingEntity.buffer);
  }

  @Get('file/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getImage(@Param('id') id: string, @Res() response) {
    const { file } = await this.service.findFile(id, ['file']);
    response.contentType(getType(file.fileName));
    response.send(file.buffer);
  }

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
  async uploadFile(@UploadedFiles() files: MulterFileInfo[]) {
    const results = await Promise.all(
      files.map((file) => this.service.create(file))
    );

    const result = results.map((r) => r.toJSON());
    result.forEach((res) => {
      // ! Janky need to delete since lazy is getting ignored and the data is recursive on parent
      delete res.altFile;
      delete res.file;
      delete res.thumbnail;
    });

    return result;
  }
}
