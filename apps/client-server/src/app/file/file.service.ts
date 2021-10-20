import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FileService {
  private readonly logger: Logger = new Logger(FileService.name);
}
