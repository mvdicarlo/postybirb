/* eslint-disable no-param-reassign */
import util from 'util';
import winston from 'winston';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LEVEL, MESSAGE, SPLAT } from 'triple-beam';

// For some reason combining already existing formatters
// Was not enough to make logging look like NestJS

export class SerializeLog {
  timestamp = winston.format.timestamp();

  colorizer = winston.format.colorize({ colors: { error: ['red', 'bold'] } });

  transform(info: winston.Logform.TransformableInfo) {
    this.timestamp.transform(info, { format: 'YYYY.MM.DD HH:mm:ss.SSS' });

    // Remove internal info & get values
    const {
      [LEVEL]: level,
      [SPLAT]: splat,
      timestamp,
      padding,
      message,
    } = info;

    // Mix label
    let label = '';
    if (timestamp) label += `${timestamp} `;
    if (level) label += `[${level.toUpperCase()}]`;
    if (padding && level && typeof padding === 'object' && level in padding) {
      label += (padding as Record<string, string>)[level];
    }

    // Errors from loglayer come as { err: <Error> }
    const normalizedSplat =
      (splat as undefined | unknown[])?.map((e) =>
        typeof e === 'object' && e && 'err' in e && Object.keys(e).length === 1
          ? e.err
          : e,
      ) ?? [];

    // Colorize label
    label = this.colorizer.colorize(level, label);

    // Mix all
    info[MESSAGE] =
      `${label} ${util.formatWithOptions({ colors: true }, message, ...normalizedSplat)}`;

    return info;
  }
}
