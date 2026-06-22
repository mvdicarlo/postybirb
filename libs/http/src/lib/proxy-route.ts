export type ProxyRequestContext = {
  partition?: string;
};

export type BrowserSessionRoute = {
  partitionId: string | undefined;
};

export function resolveBrowserSessionRoute(
  context: ProxyRequestContext,
): BrowserSessionRoute {
  const partitionId = context.partition?.trim();
  return {
    partitionId: partitionId || undefined,
  };
}
