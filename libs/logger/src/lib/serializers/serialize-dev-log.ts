/* eslint-disable no-param-reassign */
import util from 'util';
import winston from 'winston';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LEVEL, MESSAGE, SPLAT } from 'triple-beam';
import { isErrorLike } from './serialize-errors';

// For some reason combining already existing formatters
// Was not enough to make logging look like NestJS

export class SerializeDevLog {
  timestamp = winston.format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' });

  colorizer = winston.format.colorize();

  transform(info: winston.Logform.TransformableInfo) {
    this.timestamp.transform(info);

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

    delete (clearCtx as any).level;
    delete (clearCtx as any)[SPLAT];
    delete (clearCtx as any)[MESSAGE];
    delete (clearCtx as any).splat;

    // Stringify
    const stringifiedCtx = util.inspect(clearCtx, {
      showHidden: true,
      colors: true,
    });
    let clearCtxString = stringifiedCtx !== '{}' ? `\n${stringifiedCtx}` : '';

    // Add error
    if (isErrorLike(err)) {
      clearCtxString += '\n';
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
    if (timestamp) label += `[${timestamp}]`;
    if (prefix) label += `[${prefix}]`;
    if (level) label += `[${level.toUpperCase()}]`;
    if (padding && level) label += padding[level];

    // Colorize label
    label = this.colorizer.colorize(level || 'info', label);

    // Mix all
    info[MESSAGE] = `${label} ${message}${clearCtxString}`;

    return info;
  }
}
