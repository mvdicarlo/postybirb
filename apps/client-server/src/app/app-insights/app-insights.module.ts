import { Global, Module, OnModuleInit } from '@nestjs/common';
import {
  flushAppInsights,
  getAppInsightsClient,
  initializeAppInsights,
  trackException,
} from '@postybirb/logger';

@Global()
@Module({
  providers: [
    {
      provide: 'APP_INSIGHTS',
      useFactory: () => {
        initializeAppInsights({
          // enabled:
          // process.env.NODE_ENV === 'production' ||
          // process.env.ENABLE_APP_INSIGHTS === 'true',
          enabled: true,
          appVersion: process.env.POSTYBIRB_VERSION || 'unknown',
        });
        return getAppInsightsClient();
      },
    },
  ],
  exports: ['APP_INSIGHTS'],
})
export class AppInsightsModule implements OnModuleInit {
  onModuleInit() {
    // Set up global exception handler for NestJS backend
    process.on('uncaughtException', (error: Error) => {
      // eslint-disable-next-line no-console
      console.error('Uncaught Exception in Backend:', error);
      trackException(error, {
        source: 'nestjs-backend',
        type: 'uncaughtException',
      });
      flushAppInsights();
    });

    process.on('unhandledRejection', (reason: unknown) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      // eslint-disable-next-line no-console
      console.error('Unhandled Rejection in Backend:', error);
      trackException(error, {
        source: 'nestjs-backend',
        type: 'unhandledRejection',
      });
      flushAppInsights();
    });
  }
}
