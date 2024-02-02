import { initializeLogger, SerializeDevLog } from '@postybirb/logger';
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

function createLogger() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const winston: typeof import('winston') = require('winston');
  const { transports } = winston;
  const { combine, timestamp, prettyPrint } = winston.format;
  const consoleTransport = new transports.Console();
  const w = winston.createLogger({
    level: environment.production ? 'info' : 'debug',
    format: environment.production
      ? combine(timestamp(), prettyPrint({ colorize: true }))
      : new SerializeDevLog(),
    transports: [consoleTransport],
    rejectionHandlers: [consoleTransport],
    exceptionHandlers: [consoleTransport],
  });
  initializeLogger(w, environment.production);
}

export function startMetrics() {
  appInsights
    .setup(environment.app_insights_instrumentation_key)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(false) // Don't really need http request logging
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(false)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI)
    .start();

  setDefaultProps();
  setDefaultTags();

  // Logger needs to be initialized after app insights
  // to read from diagnostics channel
  createLogger();
}
