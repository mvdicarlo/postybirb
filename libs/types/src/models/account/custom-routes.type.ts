export type CustomRoutes = Record<
  string,
  { request: unknown; response: unknown }
>;

type MaybePromise<T> = T | Promise<T>;

export type CustomRouteHandlers<T extends CustomRoutes> = {
  [K in keyof T]: (request: T[K]['request']) => MaybePromise<T[K]['response']>;
};
