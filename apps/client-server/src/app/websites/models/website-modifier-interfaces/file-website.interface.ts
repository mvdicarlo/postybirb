import { Class } from 'type-fest';
import FileSubmission from '../../../submission/models_maybe/file-submission.model';
import FileWebsiteOptions from '../../../submission/models_maybe/file-website-options.model';
import PostData from '../../../submission/models_maybe/post-data.model';
import { UnknownWebsite } from '../../website';

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
