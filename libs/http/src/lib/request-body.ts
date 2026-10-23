import FormData from 'form-data';
import urlEncoded from 'form-urlencoded';
import { FormFile } from './form-file';
import type { BinaryPostOptions, HttpRequestBody, PostOptions } from './types';

export function createRequestBody(
  options: PostOptions | BinaryPostOptions,
): HttpRequestBody {
  const { data, type, options: httpOptions } = options;

  switch (type) {
    case 'json':
      return {
        contentType: 'application/json',
        buffer: Buffer.from(JSON.stringify(data)),
      };

    case 'urlencoded':
      return {
        contentType: 'application/x-www-form-urlencoded',
        buffer: Buffer.from(
          urlEncoded(data, {
            skipIndex: httpOptions?.skipUrlEncodedIndexing ?? false,
          }),
        ),
      };

    case 'binary':
      return {
        contentType: 'application/octet-stream',
        buffer: data,
      };

    case 'multipart': {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (value instanceof FormFile) {
          form.append(key, value.buffer, value.fileOptions);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item instanceof FormFile) {
              form.append(key, item.buffer, item.fileOptions);
            } else {
              form.append(key, item);
            }
          });
        } else {
          form.append(key, value.toString());
        }
      });

      return {
        contentType: form.getHeaders()['content-type'],
        buffer: form.getBuffer(),
      };
    }

    default:
      throw new Error(`Unknown post type: ${type}`);
  }
}
