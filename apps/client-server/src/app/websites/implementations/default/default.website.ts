import {
  DynamicObject,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  SimpleValidationResult,
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { BaseWebsiteOptions } from '../../models/base-website-options';
import { DefaultWebsiteOptions } from '../../models/default-website-options';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';

// This is a stub used for filling in for places where we have a null account
// but need to have a website instance.
@WebsiteMetadata({ name: 'default', displayName: 'Default' })
export default class DefaultWebsite
  extends Website<DynamicObject>
  implements
    FileWebsite<DefaultWebsiteOptions>,
    MessageWebsite<DefaultWebsiteOptions>
{
  createMessageModel(): BaseWebsiteOptions {
    return new DefaultWebsiteOptions();
  }

  createFileModel(): BaseWebsiteOptions {
    return new DefaultWebsiteOptions();
  }

  onPostMessageSubmission(
    postData: PostData<DefaultWebsiteOptions>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateMessageSubmission(
    postData: PostData<DefaultWebsiteOptions>,
  ): Promise<SimpleValidationResult> {
    return {};
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<DefaultWebsiteOptions>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateFileSubmission(
    postData: PostData<DefaultWebsiteOptions>,
  ): Promise<SimpleValidationResult> {
    return {};
  }

  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DynamicObject = {};

  public onLogin(): Promise<ILoginState> {
    throw new Error('Method not implemented.');
  }
}
