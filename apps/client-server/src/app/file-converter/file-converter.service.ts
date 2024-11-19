import { Injectable } from '@nestjs/common';
import { IFileBuffer } from '@postybirb/types';
import { IFileConverter } from './converters/file-converter';
import { TextFileConverter } from './converters/text-file-converter';

@Injectable()
export class FileConverterService {
  private readonly converters: IFileConverter[] = [new TextFileConverter()];

  public async convert(
    file: IFileBuffer,
    allowableOutputMimeTypes: string[],
  ): Promise<IFileBuffer> {
    const converter = this.converters.find((c) =>
      c.canConvert(file, allowableOutputMimeTypes),
    );

    if (!converter) {
      throw new Error('No converter found for file');
    }

    return converter.convert(file, allowableOutputMimeTypes);
  }

  public async canConvert(
    mimeType: string,
    allowableOutputMimeTypes: string[],
  ): Promise<boolean> {
    return this.converters.some((c) =>
      c.canConvert({ mimeType } as IFileBuffer, allowableOutputMimeTypes),
    );
  }
}
