// SOURCE: https://github.com/sindresorhus/serialize-error

/* eslint-disable no-underscore-dangle */
/* eslint-disable no-empty */
/* eslint-disable no-continue */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-use-before-define */
import errorConstructors from '../error-constructors';

export class NonError extends Error {
  name = 'NonError';

  constructor(message) {
    super(NonError._prepareSuperMessage(message));
  }

  static _prepareSuperMessage(message) {
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}

const commonProperties = [
  {
    property: 'name',
    enumerable: false,
  },
  {
    property: 'message',
    enumerable: false,
  },
  {
    property: 'stack',
    enumerable: false,
  },
  {
    property: 'code',
    enumerable: true,
  },
  {
    property: 'cause',
    enumerable: false,
  },
];

const toJsonWasCalled = new WeakSet();

const toJSON = (from) => {
  toJsonWasCalled.add(from);
  const json = from.toJSON();
  toJsonWasCalled.delete(from);
  return json;
};

const getErrorConstructor = (name) => errorConstructors.get(name) ?? Error;

// eslint-disable-next-line complexity
const destroyCircular = ({
  from,
  seen,
  to,
  forceEnumerable,
  maxDepth,
  depth,
  useToJSON,
  serialize,
}: any) => {
  if (!to) {
    if (Array.isArray(from)) {
      to = [];
    } else if (!serialize && isErrorLike(from)) {
      const Error = getErrorConstructor(from.name);
      to = new (Error as any)();
    } else {
      to = {};
    }
  }

  seen.push(from);

  if (depth >= maxDepth) {
    return to;
  }

  if (
    useToJSON &&
    typeof from.toJSON === 'function' &&
    !toJsonWasCalled.has(from)
  ) {
    return toJSON(from);
  }

  const continueDestroyCircular = (value) =>
    destroyCircular({
      from: value,
      seen: [...seen],
      forceEnumerable,
      maxDepth,
      depth,
      useToJSON,
      serialize,
    });

  for (const [key, value] of Object.entries(from)) {
    if (typeof Buffer === 'function' && Buffer.isBuffer(value)) {
      to[key] = '[object Buffer]';
      continue;
    }

    // TODO: Use `stream.isReadable()` when targeting Node.js 18.
    if (
      value !== null &&
      typeof value === 'object' &&
      (typeof value as any).pipe === 'function'
    ) {
      to[key] = '[object Stream]';
      continue;
    }

    if (typeof value === 'function') {
      continue;
    }

    if (!value || typeof value !== 'object') {
      // Gracefully handle non-configurable errors like `DOMException`.
      try {
        to[key] = value;
      } catch {}

      continue;
    }

    if (!seen.includes(from[key])) {
      depth++;
      to[key] = continueDestroyCircular(from[key]);

      continue;
    }

    to[key] = '[Circular]';
  }

  for (const { property, enumerable } of commonProperties) {
    if (typeof from[property] !== 'undefined' && from[property] !== null) {
      Object.defineProperty(to, property, {
        value: isErrorLike(from[property])
          ? continueDestroyCircular(from[property])
          : from[property],
        enumerable: forceEnumerable ? true : enumerable,
        configurable: true,
        writable: true,
      });
    }
  }

  return to;
};

export function serializeError(value, options: any = {}) {
  const { maxDepth = Number.POSITIVE_INFINITY, useToJSON = true } = options;

  if (typeof value === 'object' && value !== null) {
    return destroyCircular({
      from: value,
      seen: [],
      forceEnumerable: true,
      maxDepth,
      depth: 0,
      useToJSON,
      serialize: true,
    });
  }

  // People sometimes throw things besides Error objects…
  if (typeof value === 'function') {
    // `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
    // We intentionally use `||` because `.name` is an empty string for anonymous functions.
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  return value;
}

export function isErrorLike(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    'name' in value &&
    'message' in value &&
    'stack' in value
  );
}

export { default as errorConstructors } from '../error-constructors';

