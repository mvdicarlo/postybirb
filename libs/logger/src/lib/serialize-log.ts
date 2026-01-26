/* eslint-disable no-param-reassign */
import util from 'util';
import winston from 'winston';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LEVEL, MESSAGE, SPLAT } from 'triple-beam';

// For some reason combining already existing formatters
// Was not enough to make logging look like NestJS

export class SerializeLog {
  timestamp = winston.format.timestamp();

  colorizer = winston.format.colorize();

  transform(info: winston.Logform.TransformableInfo) {
    this.timestamp.transform(info, { format: 'YYYY.MM.DD HH:mm:ss.SSS' });

    // Remove internal info & get values
    const {
      [LEVEL]: level,
      timestamp,
      prefix,
      padding,
      message,
      err,
      ...clearCtx
    } = info;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (clearCtx as any).level;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (clearCtx as any)[SPLAT];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (clearCtx as any)[MESSAGE];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (clearCtx as any).splat;

    // Stringify
    const stringifiedCtx = util.inspect(clearCtx, {
      showHidden: true,
      colors: true,
    });
    let clearCtxString = stringifiedCtx !== '{}' ? `\n${stringifiedCtx}` : '';

    // Add error
    if (isErrorLike(err)) {
      if (err instanceof Error) {
        // Util inspect applies some nice formatting
        // to the error when it is Error instance
        clearCtxString += util.inspect(err, { colors: true });
      } else {
        // Stack already includes error.type and error.message
        clearCtxString += (err as Error).stack;
      }
    }

    // Mix label
    let label = '';
    if (timestamp) label += `${timestamp} `;
    if (prefix) label += `[${prefix}]`;
    if (level) label += `[${level.toUpperCase()}]`;
    if (padding && level && typeof padding === 'object' && level in padding) {
      label += (padding as Record<string, string>)[level];
    }

    // Colorize label
    label = this.colorizer.colorize(level || 'info', label);

    // Mix all
    info[MESSAGE] = `${label} ${message}${clearCtxString}`;

    return info;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isErrorLike(value: any) {
  return (
    value !== null &&
    typeof value === 'object' &&
    'name' in value &&
    'message' in value &&
    'stack' in value
  );
}
