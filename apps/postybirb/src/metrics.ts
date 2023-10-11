import * as appInsights from 'applicationinsights';
import { environment } from './environments/environment';

function setDefaultProps() {
  appInsights.defaultClient.commonProperties = {
    version: environment.version,
    environment: environment.production ? 'production' : 'development',
  };
}

function setDefaultTags() {
  appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole
  ] = 'postybirb';
}

export function startMetrics(): appInsights.TelemetryClient {
  appInsights
    .setup(environment.app_insights_instrumentation_key)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(false) // Don't really need http request logging
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI)
    .start();

  setDefaultProps();
  setDefaultTags();
  return appInsights.defaultClient;
}
