export type PostResponse = {
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
  additionalInfo: unknown;
};
