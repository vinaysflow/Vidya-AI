import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '0.1.0',

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-admin-secret'];
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized');
} else {
  console.log('[Sentry] Skipped — SENTRY_DSN not set');
}

export { Sentry };
