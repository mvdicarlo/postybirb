/* eslint-disable no-param-reassign */
import util from 'util';
import winston from 'winston';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MESSAGE, SPLAT, LEVEL } from 'triple-beam';
import { isErrorLike } from './serialize-errors';

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

    delete clearCtx.level;
    delete clearCtx[SPLAT];
    delete clearCtx[MESSAGE];
    delete clearCtx.splat;

    // Stringify
    const stringifiedCtx = util.inspect(clearCtx, {
      showHidden: true,
      colors: true,
    });
    let clearCtxString = stringifiedCtx !== '{}' ? `\n${stringifiedCtx}` : '';

    // Add error.
    if (isErrorLike(err)) {
      clearCtxString += '\n';
      if (err instanceof Error) {
        // Util inspect applies some nice formatting
        // to the error when it is class instance
        clearCtxString += util.inspect(err, { colors: true });
      } else {
        // Note that stack already includes type and message
        clearCtxString += err.stack;
      }
    }

    // Mix label
    let label = '';
    if (timestamp) label += `[${timestamp}]`;
    if (prefix) label += `[${prefix}]`;
    if (level) label += `[${level.toUpperCase()}]`;
    if (padding) label += padding[level];

    // Colorize label
    label = this.colorizer.colorize(level, label);

    // Mix all
    info[MESSAGE] = `${label} ${message}${clearCtxString}`;

    return info;
  }
}
