import { IFileBuffer } from '@postybirb/types';
import { htmlToText } from 'html-to-text';
import { TurndownService } from 'turndown';
import { IFileConverter } from './file-converter';

const supportedInputMimeTypes = ['text/html'] as const;
const supportedOutputMimeTypes = [
  'text/plain',
  'text/html',
  'text/markdown',
] as const;

type SupportedInputMimeTypes = (typeof supportedInputMimeTypes)[number];
type SupportedOutputMimeTypes = (typeof supportedOutputMimeTypes)[number];

type ConversionMap = {
  [inputMimeType in SupportedInputMimeTypes]: {
    [outputMimeType in SupportedOutputMimeTypes]: (
      file: IFileBuffer,
    ) => Promise<IFileBuffer>;
  };
};

type ConversionWeights = {
  [outputMimeType in SupportedOutputMimeTypes]: number;
};

/**
 * A class that converts text files to other text formats.
 * Largely for use when converting AltFiles (text/html) to other desirable formats.
 * @class TextFileConverter
 * @implements {IFileConverter}
 */
export class TextFileConverter implements IFileConverter {
  private readonly supportConversionMappers: ConversionMap = {
    'text/html': {
      'text/html': this.passThrough,
      'text/plain': this.convertHtmlToPlaintext,
      'text/markdown': this.convertHtmlToMarkdown,
    },
  };

  /**
   * Defines the preference of conversion, trying to convert to the most preferred format first.
   */
  private readonly conversionWeights: ConversionWeights = {
    'text/plain': Number.MAX_SAFE_INTEGER,
    'text/html': 1,
    'text/markdown': 2,
  };

  canConvert(file: IFileBuffer, allowableOutputMimeTypes: string[]): boolean {
    return (
      supportedInputMimeTypes.includes(
        file.mimeType as SupportedInputMimeTypes,
      ) &&
      supportedOutputMimeTypes.some((m) => allowableOutputMimeTypes.includes(m))
    );
  }

  async convert(
    file: IFileBuffer,
    allowableOutputMimeTypes: string[],
  ): Promise<IFileBuffer> {
    const conversionMap =
      this.supportConversionMappers[file.mimeType as SupportedInputMimeTypes];

    const sortedOutputMimeTypes = allowableOutputMimeTypes
      .filter((mimeType) => mimeType in conversionMap)
      .sort(
        (a, b) =>
          this.conversionWeights[a as SupportedOutputMimeTypes] -
          this.conversionWeights[b as SupportedOutputMimeTypes],
      );

    for (const outputMimeType of sortedOutputMimeTypes) {
      const conversionFunction =
        conversionMap[outputMimeType as SupportedOutputMimeTypes];
      if (conversionFunction) {
        return conversionFunction(file);
      }
    }

    throw new Error(
      `Cannot convert file ${file.fileName} with mime type: ${file.mimeType}`,
    );
  }

  private async passThrough(file: IFileBuffer): Promise<IFileBuffer> {
    return { ...file };
  }

  private async convertHtmlToPlaintext(
    file: IFileBuffer,
  ): Promise<IFileBuffer> {
    const text = htmlToText(file.buffer.toString(), {
      wordwrap: 120,
    });
    return this.toMergedBuffer(file, text, 'text/plain');
  }

  private async convertHtmlToMarkdown(file: IFileBuffer): Promise<IFileBuffer> {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(file.buffer.toString());
    return this.toMergedBuffer(file, markdown, 'text/markdown');
  }

  private toMergedBuffer(
    fb: IFileBuffer,
    str: string,
    mimeType: string,
  ): IFileBuffer {
    return {
      ...fb,
      buffer: Buffer.from(str),
      mimeType,
    };
  }
}
