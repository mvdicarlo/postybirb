export type IPostResponse = {
  /**
   * The exception associated with the post.
   * @type {Error}
   */
  exception?: Error;

  /**
   * The source Url of the post.
   * @type {string}
   */
  sourceUrl?: string;

  /**
   * The stage that the post failed at.
   * Not always present if unexpected throw occurs.
   * @type {string}
   */
  stage?: string;

  /**
   * The response message to return to a user.
   * Flexible for different types of responses.
   * @type {string}
   */
  message?: string;

  /**
   * Any additional logging info that may be useful.
   * @type {unknown}
   */
  additionalInfo?: unknown;

  /**
   * The instance id of the post.
   * @type {string}
   */
  instanceId: string;
};

export class PostResponse implements IPostResponse {
  exception?: Error;

  sourceUrl?: string;

  stage?: string;

  message?: string;

  additionalInfo?: unknown;

  instanceId: string;

  static fromWebsite(website: { id: string }) {
    const response = new PostResponse();
    response.instanceId = website.id;
    return response;
  }

  withException(exception: Error) {
    this.exception = exception;
    if (!this.message) {
      this.message = exception.message;
    }
    return this;
  }

  withMessage(message: string) {
    this.message = message;
    return this;
  }

  withSourceUrl(url: string) {
    this.sourceUrl = url;
    return this;
  }

  withAdditionalInfo(info: unknown) {
    this.additionalInfo = info;
    return this;
  }

  atStage(stage: string) {
    this.stage = stage;
    return this;
  }
}
