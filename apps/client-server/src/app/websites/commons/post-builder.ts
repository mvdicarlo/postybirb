import { Http, PostOptions } from '@postybirb/http';
import { FileType, PostResponse } from '@postybirb/types';
import { CancellableToken } from '../../post/models/cancellable-token';
import { PostingFile } from '../../post/models/posting-file';
import { UnknownWebsite } from '../website';

/**
 * Represents a field value that can be stored in the post data.
 */
type FieldValue = string | number | boolean | null | undefined | object;

/**
 * Represents a value that can be either a single field value or an array of field values.
 */
type Value = FieldValue | FieldValue[];

/**
 * A builder class for constructing HTTP POST requests to various websites.
 * Uses the builder pattern to allow fluent method chaining for configuring
 * request data, headers, and content type.
 *
 * @example
 * ```typescript
 * const response = await new PostBuilder(website, cancellationToken)
 *   .asMultipart()
 *   .withHeader('Authorization', 'Bearer token')
 *   .setField('title', 'My Post')
 *   .addFile('image', postingFile)
 *   .send<ApiResponse>('https://api.example.com/posts');
 * ```
 */
export class PostBuilder {
  /**
   * The type of POST request to send (json, multipart, or urlencoded).
   * @private
   */
  private postType: PostOptions['type'] = 'json';

  /**
   * The data payload that will be sent in the POST request.
   * @private
   */
  private data: Record<string, Value> = {};

  /**
   * HTTP headers to include with the request.
   * @private
   */
  private readonly headers: Record<string, string> = {};

  /**
   * Creates a new PostBuilder instance.
   *
   * @param website - The website instance for which the post is being built
   * @param cancellationToken - Token used to cancel the request if needed
   */
  constructor(
    private readonly website: UnknownWebsite,
    private readonly cancellationToken: CancellableToken,
  ) {}

  /**
   * Adds an HTTP header to the request.
   *
   * @param key - The header name
   * @param value - The header value
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.withHeader('Content-Type', 'application/json')
   *        .withHeader('Authorization', 'Bearer token');
   * ```
   */
  withHeader(key: string, value: string) {
    this.headers[key] = value;
    return this;
  }

  /**
   * Configures the request to use multipart/form-data encoding.
   * This is typically used when uploading files or sending binary data.
   *
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.asMultipart().addFile('image', file);
   * ```
   */
  asMultipart() {
    this.postType = 'multipart';
    return this;
  }

  /**
   * Configures the request to use JSON encoding (default).
   * The request body will be sent as JSON with appropriate Content-Type header.
   *
   * @returns The PostBuilder instance for method chaining
   */
  asJson() {
    this.postType = 'json';
    return this;
  }

  /**
   * Configures the request to use URL-encoded form data.
   * The request body will be sent as application/x-www-form-urlencoded.
   *
   * @returns The PostBuilder instance for method chaining
   */
  asUrlEncoded() {
    this.postType = 'urlencoded';
    return this;
  }

  /**
   * Merges the provided data object with the existing request data.
   * Existing keys will be overwritten with new values.
   *
   * @param data - Object containing key-value pairs to add to the request
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.withData({
   *   title: 'My Post',
   *   description: 'Post description',
   *   tags: ['tag1', 'tag2']
   * });
   * ```
   */
  withData(data: Record<string, Value>) {
    this.data = { ...this.data, ...data };
    return this;
  }

  /**
   * Sets a single field in the request data.
   * Handles null values by converting them to undefined.
   * For arrays, filters out null values and converts them to undefined.
   *
   * @param key - The field name
   * @param value - The field value (can be a single value or array)
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setField('title', 'My Post Title')
   *        .setField('tags', ['art', 'digital', 'illustration']);
   * ```
   */
  setField(key: string, value: Value) {
    if (Array.isArray(value)) {
      this.data[key] = value.map((v) => (v === null ? undefined : v));
    } else {
      this.data[key] = value === null ? undefined : value;
    }
    return this;
  }

  /**
   * Conditionally sets a field based on a predicate.
   * Useful for setting fields based on user preferences or feature flags.
   *
   * @param key - The field name
   * @param predicate - Boolean condition to evaluate
   * @param truthy - Value to set if predicate is true
   * @param falsy - Value to set if predicate is false (optional)
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.setConditional('nsfw', post.isNsfw, true, false)
   *        .setConditional('rating', post.rating > 0, post.rating);
   * ```
   */
  setConditional(
    key: string,
    predicate: boolean,
    truthy: Value,
    falsy?: Value,
  ) {
    const value = predicate ? truthy : falsy;
    this.data[key] = value;
    return this;
  }

  /**
   * Adds a file to the request data using the specified field name.
   * The file is converted to the appropriate post format.
   *
   * @param key - The field name for the file
   * @param file - The PostingFile instance to add
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addFile('artwork', postingFile)
   *        .addFile('reference', referenceFile);
   * ```
   */
  addFile(key: string, file: PostingFile) {
    this.data[key] = file.toPostFormat();
    return this;
  }

  /**
   * Adds a thumbnail to the request data.
   * If the file has a thumbnail, it uses that; otherwise, for image files,
   * it uses the original file as the thumbnail.
   *
   * @param key - The field name for the thumbnail
   * @param file - The PostingFile instance from which to extract the thumbnail
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addFile('video', videoFile)
   *        .addThumbnail('thumbnail', videoFile);
   * ```
   */
  addThumbnail(key: string, file: PostingFile) {
    if (file.thumbnail) {
      this.data[key] = file.thumbnailToPostFormat();
    } else if (file.fileType === FileType.IMAGE) {
      this.data[key] = file.toPostFormat();
    } else {
      this.data[key] = '';
    }
    return this;
  }

  /**
   * Sends the constructed POST request to the specified URL.
   * Validates the response and handles cancellation.
   *
   * @template ReturnValue - The expected type of the response body
   * @param url - The URL to send the POST request to
   * @returns Promise resolving to the response body
   * @throws {Error} If the request is cancelled or the response is invalid
   *
   * @example
   * ```typescript
   * interface ApiResponse {
   *   id: string;
   *   status: 'success' | 'error';
   * }
   *
   * const response = await builder.send<ApiResponse>('https://api.example.com/posts');
   * console.log(response.id);
   * ```
   */
  async send<ReturnValue>(url: string) {
    this.cancellationToken.throwIfCancelled();
    const value = await Http.post<ReturnValue>(url, {
      partition: this.website.account.id,
      type: this.postType,
      data: this.build(),
      headers: this.headers,
    });
    PostResponse.validateBody(this.website, value);
    return value;
  }

  /**
   * Builds and returns the final data object that will be sent in the request.
   * Handles special formatting for multipart requests:
   * - Removes undefined values
   * - Converts boolean values to strings
   * - Filters undefined values from arrays
   * - Converts boolean values in arrays to strings
   *
   * @returns The processed data object ready for transmission
   *
   * @example
   * ```typescript
   * const data = builder.build();
   * // For multipart: { "nsfw": "true", "tags": ["art", "digital"] }
   * // For JSON: { "nsfw": true, "tags": ["art", "digital"] }
   * ```
   */
  public build(): Record<string, Value> {
    const data = { ...this.data };
    if (this.postType === 'multipart') {
      Object.keys(data).forEach((key) => {
        // If the value is undefined and we don't allow it, delete the key
        // This is necessary for multipart/form-data where undefined values are not allowed
        if (data[key] === undefined) {
          delete data[key];
        }

        if (typeof data[key] === 'boolean') {
          // Convert boolean values to string for multipart/form-data
          data[key] = data[key] ? 'true' : 'false';
        }

        if (Array.isArray(data[key])) {
          // If the value is an array, filter out undefined values
          data[key] = (data[key] as FieldValue[])
            .filter((v) => v !== undefined)
            .map((v) => {
              // Convert boolean values to string for multipart/form-data
              if (typeof v === 'boolean') {
                return v ? 'true' : 'false';
              }
              return v;
            });
        }
      });
    }

    return data;
  }
}
