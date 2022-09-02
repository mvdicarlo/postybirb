import { FileWebsiteOptions, FileSubmission, PostData } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../../website';

/**
 * Defines methods for allowing file based posting.
 * Generally this will always be used by each supported website.
 * @interface FileWebsite
 */
export interface FileWebsite<T extends FileWebsiteOptions> {
  FileModel: Class<T>;
  supportsFile: true;
  supportsAdditionalFiles: boolean;

  createFileModel(): T;

  onPostFileSubmission(
    postData: PostData<T>,
    cancellationToken: unknown
  ): Promise<unknown>;

  onValidateFileSubmission(
    submissionData: FileSubmission,
    postData: PostData<T>
  ): Promise<unknown>;
}

export function isFileWebsite(
  websiteInstance: UnknownWebsite
): websiteInstance is FileWebsite<FileWebsiteOptions> & UnknownWebsite {
  return Boolean(
    (websiteInstance as FileWebsite<FileWebsiteOptions> & UnknownWebsite)
      .supportsFile
  );
}
