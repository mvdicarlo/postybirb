import { Logger } from '@nestjs/common';
import SubmissionType from '../submission/enums/submission-type.enum';
import BaseWebsiteOptions from '../submission/models/base-website-options.model';
import FileSubmission from '../submission/models/file-submission.model';
import FileWebsiteOptions from '../submission/models/file-website-options.model';
import MessageSubmission from '../submission/models/message-submission.model';
import PostData from '../submission/models/post-data.model';
import Submission from '../submission/models/submission.model';
import LoginRequestData from './models/login-request-data.model';
import LoginResponse from './models/login-response.model';

export default abstract class Website<V extends Record<string, unknown>> {
  protected readonly logger: Logger;

  protected abstract readonly BASE_URL: string;

  protected data: Record<string, unknown>;

  constructor() {
    this.logger = new Logger(typeof this);
  }

  public onInitialize(data: V | undefined): void {
    this.data = data ?? {};
  }

  public abstract onLogin(
    request: LoginRequestData<V>
  ): Promise<LoginResponse<V>>;

  // TODO models need to be completely revamped during actual implementation design
  public onPost(
    postData: PostData<any>,
    accountData: Record<string, unknown>,
    cancellationToken: unknown
  ): Promise<unknown> {
    switch (postData.type) {
      case SubmissionType.FILE: {
        return this.onPostFileSubmission(
          postData,
          accountData,
          cancellationToken
        );
      }

      case SubmissionType.MESSAGE: {
        return this.onPostMessageSubmission(
          postData,
          accountData,
          cancellationToken
        );
      }
    }
  }

  public onPostFileSubmission<T extends FileWebsiteOptions>(
    postData: PostData<T>,
    accountData: Record<string, unknown>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method onPostFileSubmission not implemented');
  }

  public onPostMessageSubmission<T extends BaseWebsiteOptions>(
    postData: PostData<T>,
    accountData: Record<string, unknown>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method onPostMessageSubmission not implemented');
  }

  // TODO models need to be completely revamped during actual implementation design
  public onValidate(
    submissionData: Submission,
    postData: PostData<any>,
    accountData: Record<string, unknown>
  ): Promise<unknown> {
    switch (postData.type) {
      case SubmissionType.FILE: {
        return this.onValidateFileSubmission(
          submissionData as FileSubmission,
          postData,
          accountData
        );
      }

      case SubmissionType.MESSAGE: {
        return this.onValidateMessageSubmission(
          submissionData as MessageSubmission,
          postData,
          accountData
        );
      }
    }
  }

  public onValidateFileSubmission<T extends FileWebsiteOptions>(
    submissionData: FileSubmission,
    postData: PostData<T>,
    accountData: Record<string, unknown>
  ): Promise<unknown> {
    throw new Error('Method onValidateFileSubmission not implemented');
  }

  public onValidateMessageSubmission<T extends BaseWebsiteOptions>(
    submissionData: MessageSubmission,
    postData: PostData<T>,
    accountData: Record<string, unknown>
  ): Promise<unknown> {
    throw new Error('Method onValidateMessageSubmission not implemented');
  }
}
