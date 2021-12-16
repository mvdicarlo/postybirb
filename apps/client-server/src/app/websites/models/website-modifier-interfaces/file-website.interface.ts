import FileSubmission from '../../../submission/models_maybe/file-submission.model';
import FileWebsiteOptions from '../../../submission/models_maybe/file-website-options.model';
import PostData from '../../../submission/models_maybe/post-data.model';
import { Class } from 'type-fest';

export interface FileWebsite<T extends FileWebsiteOptions> {
  fileModel: Class<T>;
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
