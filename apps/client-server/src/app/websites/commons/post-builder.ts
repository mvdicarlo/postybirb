import { FormFile, Http, PostOptions } from '@postybirb/http';
import { Logger } from '@postybirb/logger';
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
  private readonly logger = Logger('PostBuilder');

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
   * Set of field names that are expected to contain file data based on input.
   * Used to enhance logging and debugging by identifying which fields
   * are intended for file uploads.
   * @private
   */
  private readonly fileFields = new Set<string>();

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
   * Adds multiple headers to the request.
   * Merges the provided headers with existing ones.
   *
   * @param headers - Object containing key-value pairs of headers
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.withHeaders({
   *   'Content-Type': 'application/json',
   *   'Authorization': 'Bearer token'
   * });
   * ```
   */
  withHeaders(headers: Record<string, string>) {
    Object.entries(headers).forEach(([key, value]) => {
      this.headers[key] = value;
    });
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

  getField<T>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  removeField(key: string) {
    delete this.data[key];
    if (this.fileFields.has(key)) {
      this.fileFields.delete(key);
    }
    return this;
  }

  /**
   * Sets a single field in the request data.
   * Handles null values by converting them to undefined.
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
    this.insert(key, value);
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
    this.insert(key, predicate ? truthy : falsy);
    return this;
  }

  /**
   * Iterates over an array and executes a callback for each item.
   *
   * @param items - Array of items to iterate over
   * @param callback - Function to execute for each item
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.forEach(options.matureContent, (item, index, b) => {
   *   b.setField(`attributes[${item}]`, 'true');
   * });
   * ```
   */
  forEach<T>(
    items: T[] | undefined | null,
    callback: (item: T, index: number, builder: PostBuilder) => void,
  ) {
    if (items) {
      items.forEach((item, index) => callback(item, index, this));
    }
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
    this.insert(key, file);
    return this;
  }

  /**
   * Adds multiple files to the request data under the specified field name.
   * Each file is converted to the appropriate post format.
   *
   * @param key - The field name for the files
   * @param files - Array of PostingFile instances to add
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.addFiles('images', [file1, file2, file3]);
   * ```
   */
  addFiles(key: string, files: PostingFile[]) {
    this.data[key] = files.map((file) => file.toPostFormat());
    this.fileFields.add(key);
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
      this.fileFields.add(key);
    } else if (file.fileType === FileType.IMAGE) {
      this.data[key] = file.toPostFormat();
      this.fileFields.add(key);
    } else {
      this.data[key] = '';
    }
    return this;
  }

  /**
   * Conditionally executes a callback based on a predicate.
   *
   * @param predicate - Boolean condition to evaluate
   * @param callback - Function to execute if predicate is true
   * @returns The PostBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.whenTrue(rating !== 'general', (b) => {
   *   b.removeField('explicit');
   * });
   * ```
   */
  whenTrue(predicate: boolean, callback: (builder: PostBuilder) => void) {
    if (predicate) {
      callback(this);
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
   * console.log(response.body.id);
   * ```
   */
  async send<ReturnValue>(url: string) {
    this.cancellationToken.throwIfCancelled();
    const data = this.build();
    this.logger
      .withMetadata({
        website: this.website.constructor.name,
        postType: this.postType,
        url,
        headers: Object.keys(this.headers),
        data: this.sanitizeDataForLogging(data),
      })
      .debug(`Sending ${this.postType} request to ${url} with data:`);

    const maxRetries = 2;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        const value = await Http.post<ReturnValue>(url, {
          partition: this.website.account.id,
          type: this.postType,
          data,
          headers: this.headers,
        });
        this.logger.debug(`Received response from ${url}:`, value.statusCode);
        PostResponse.validateBody(this.website, value);
        return value;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const knownErrors = ['ECONNRESET', 'ERR_CONNECTION_RESET'];
        let isKnownError = false;
        for (const knownError of knownErrors) {
          const isKnown =
            error &&
            (error.code === knownError ||
              (typeof error.message === 'string' &&
                error.message.includes(knownError)));
          if (isKnown) {
            attempt++;
            lastError = error;
            if (attempt > maxRetries) break;
            this.logger.debug(
              `Retrying request to ${url} due to ${knownError} (attempt ${attempt})`,
            );
            isKnownError = true;
            break;
          }
        }

        // If the error is not a known retryable error, log it and throw
        if (!isKnownError) {
          this.logger.error(
            `Failed to send request to ${url} after ${attempt} attempts:`,
            error,
          );
          throw error;
        }
        // If known error, continue loop (unless maxRetries exceeded)
        await new Promise((resolve) => {
          // Wait for 1 second before retrying
          setTimeout(resolve, 1_000);
        });
      }
    }
    throw lastError;
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

  /**
   * Converts a PostingFile or FieldValue to the appropriate format for posting.
   * If the value is a PostingFile, it converts it to a FormFile.
   *
   * @param value - The value to convert
   * @returns The converted value in the appropriate format
   */
  private convert(value: FieldValue | PostingFile): FieldValue | FormFile {
    if (value instanceof PostingFile) {
      return value.toPostFormat();
    }
    return value;
  }

  /**
   * Inserts a key-value pair into the data object.
   * If the value is a PostingFile, it converts it to the appropriate format.
   * If the value is a FormFile, it adds the key to the fileFields set.
   *
   * @param key - The field name
   * @param value - The field value (can be a PostingFile or FieldValue)
   */
  private insert(key: string, value: FieldValue | PostingFile): void {
    const v = this.convert(value);
    this.data[key] = v;
    if (v instanceof FormFile) {
      this.fileFields.add(key);
    }
  }

  private sanitizeDataForLogging(
    data: Record<string, Value>,
  ): Record<string, Value> {
    const sanitizedData: Record<string, Value> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.fileFields.has(key)) {
        // For file fields, we don't log the actual file content
        if (Array.isArray(value)) {
          sanitizedData[key] = value.map((v) =>
            v instanceof FormFile ? v.toString() : v,
          );
        } else {
          sanitizedData[key] = value.toString();
        }
      } else {
        sanitizedData[key] = value;
      }
    }
    return sanitizedData;
  }
}
