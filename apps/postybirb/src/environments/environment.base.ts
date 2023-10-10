export const environment = {
  production: !('NX_WORKSPACE_ROOT' in process.env),
  app_insights_instrumentation_key:
    'InstrumentationKey=094ad1a6-a45f-4db4-88be-366d45360ef5;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/',
};
