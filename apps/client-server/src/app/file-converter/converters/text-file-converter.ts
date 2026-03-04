import { IFileBuffer } from '@postybirb/types';
import { htmlToText } from 'html-to-text';
import { TurndownService } from 'turndown';
import { IFileConverter } from './file-converter';

const supportedInputMimeTypes = ['text/html', 'text/plain'] as const;
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
 * Largely for use when converting AltFiles (text/plain or text/html) to other desirable formats.
 * @class TextFileConverter
 * @implements {IFileConverter}
 */
export class TextFileConverter implements IFileConverter {
  private passThrough = async (file: IFileBuffer): Promise<IFileBuffer> => ({
    ...file,
  });

  private convertHtmlToPlaintext = async (
    file: IFileBuffer,
  ): Promise<IFileBuffer> => {
    const text = htmlToText(file.buffer.toString(), {
      wordwrap: 120,
    });
    return this.toMergedBuffer(file, text, 'text/plain');
  };

  private convertHtmlToMarkdown = async (
    file: IFileBuffer,
  ): Promise<IFileBuffer> => {
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(file.buffer.toString());
    return this.toMergedBuffer(file, markdown, 'text/markdown');
  };

  /**
   * Converts plain text to HTML by wrapping lines in <p> tags.
   */
  private convertPlaintextToHtml = async (
    file: IFileBuffer,
  ): Promise<IFileBuffer> => {
    const lines = file.buffer.toString().split(/\n/);
    const html = lines
      .map((line) => `<p>${line || '<br>'}</p>`)
      .join('\n');
    return this.toMergedBuffer(file, html, 'text/html');
  };

  /**
   * Plain text is valid markdown, so this is a passthrough with mime type change.
   */
  private convertPlaintextToMarkdown = async (
    file: IFileBuffer,
  ): Promise<IFileBuffer> => this.toMergedBuffer(file, file.buffer.toString(), 'text/markdown');

  private readonly supportConversionMappers: ConversionMap = {
    'text/html': {
      'text/html': this.passThrough,
      'text/plain': this.convertHtmlToPlaintext,
      'text/markdown': this.convertHtmlToMarkdown,
    },
    'text/plain': {
      'text/plain': this.passThrough,
      'text/html': this.convertPlaintextToHtml,
      'text/markdown': this.convertPlaintextToMarkdown,
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
