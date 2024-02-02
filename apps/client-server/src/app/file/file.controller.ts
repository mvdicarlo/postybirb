import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IFileBuffer } from '@postybirb/types';
import { getType } from 'mime';
import { FileService } from './file.service';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(private readonly service: FileService) {}

  @Get('thumbnail/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getThumbnail(@Param('id') id: string, @Res() response) {
    const file = await this.service.findFile(id);
    let imageProvidingEntity: IFileBuffer | null = null;
    if (file.thumbnail) {
      imageProvidingEntity = file.thumbnail;
    }
    response.contentType(imageProvidingEntity?.mimeType ?? 'image/jpeg');
    response.send(imageProvidingEntity?.buffer ?? Buffer.from([]));
  }

  @Get('file/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  async getImage(@Param('id') id: string, @Res() response) {
    const { file } = await this.service.findFile(id);
    response.contentType(getType(file.fileName));
    response.send(file.buffer);
  }
}
