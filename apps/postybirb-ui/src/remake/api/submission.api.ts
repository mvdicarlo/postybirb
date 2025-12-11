import {
    IApplyMultiSubmissionDto,
    ICreateSubmissionDefaultOptions,
    ICreateSubmissionDto,
    IFileMetadata,
    ISubmissionDto,
    IUpdateSubmissionDto,
    IUpdateSubmissionTemplateNameDto,
    SubmissionId,
    SubmissionType,
} from '@postybirb/types';
import { BaseApi } from './base.api';

/**
 * Options for creating a file submission.
 */
export interface CreateFileSubmissionOptions {
  /** Submission type (FILE or MESSAGE) */
  type: SubmissionType;
  /** Files to upload */
  files: File[];
  /** Per-file metadata (titles) */
  fileMetadata?: IFileMetadata[];
  /** Default options (tags, description, rating) */
  defaultOptions?: ICreateSubmissionDefaultOptions;
}

class SubmissionsApi extends BaseApi<
  ISubmissionDto,
  ICreateSubmissionDto,
  IUpdateSubmissionDto
> {
  constructor() {
    super('submissions');
  }

  createMessageSubmission(name: string) {
    return this.client.post('', {
      name,
      type: SubmissionType.MESSAGE,
    });
  }

  duplicate(id: SubmissionId) {
    return this.client.post(`duplicate/${id}`);
  }

  updateTemplateName(id: SubmissionId, dto: IUpdateSubmissionTemplateNameDto) {
    return this.client.patch(`template/${id}`, dto);
  }

  /**
   * Create file submission(s) with optional metadata and default options.
   */
  createFileSubmission(options: CreateFileSubmissionOptions): ReturnType<typeof this.client.post>;
  /**
   * @deprecated Use the options object overload instead.
   */
  createFileSubmission(type: SubmissionType, files: File[]): ReturnType<typeof this.client.post>;
  createFileSubmission(
    typeOrOptions: SubmissionType | CreateFileSubmissionOptions,
    filesArg?: File[],
  ) {
    // Handle legacy call signature
    const options: CreateFileSubmissionOptions =
      typeof typeOrOptions === 'object'
        ? typeOrOptions
        : { type: typeOrOptions, files: filesArg ?? [] };

    const { type, files, fileMetadata, defaultOptions } = options;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', type);

    // Add optional metadata
    if (fileMetadata && fileMetadata.length > 0) {
      formData.append('fileMetadata', JSON.stringify(fileMetadata));
    }

    // Add optional default options
    if (defaultOptions) {
      formData.append('defaultOptions', JSON.stringify(defaultOptions));
    }

    return this.client.post('', formData);
  }

  reorder(id: SubmissionId, index: number) {
    return this.client.patch(`reorder/${id}/${index}`);
  }

  applyToMultipleSubmissions(dto: IApplyMultiSubmissionDto) {
    return this.client.patch('apply/multi', dto);
  }

  applyTemplate(id: SubmissionId, templateId: SubmissionId) {
    return this.client.patch(`apply/template/${id}/${templateId}`);
  }

  unarchive(id: SubmissionId) {
    return this.client.post(`unarchive/${id}`);
  }
}

export default new SubmissionsApi();
