import { DynamicObject } from '../models';

export type OAuthRoutes = Record<
  string,
  { request: DynamicObject; response: unknown }
>;

type MaybePromise<T> = T | Promise<T>;

export type OAuthRouteHandlers<T extends OAuthRoutes> = {
  [K in keyof T]: (request: T[K]['request']) => MaybePromise<T[K]['response']>;
};
