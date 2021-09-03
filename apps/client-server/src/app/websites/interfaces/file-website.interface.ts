import FileWebsiteOptions from '../../submission/models/file-website-options.model';
import PostData from '../../submission/models/post-data.model';
import Ctor from './constructor.interface';

export default interface FileWebsite<T extends FileWebsiteOptions> {
  fileModel: Ctor<T>;
  supportsFile: true;
  supportsAdditionalFiles: boolean;

  createFileModel(): T;

  onPostFileSubmission(
    postData: PostData<T>,
    accountData: Record<string, unknown>,
    cancellationToken: unknown
  ): Promise<unknown>;

  onValidateFileSubmission(
    postData: PostData<T>,
    accountData: Record<string, unknown>
  ): Promise<unknown>;
}
