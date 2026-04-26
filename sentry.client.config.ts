// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Disable Sentry in development unless explicitly enabled
    enabled: process.env.NODE_ENV === 'production',

    // Capture 10% of all sessions for session replay
    replaysSessionSampleRate: 0.1,
    // Always capture replays on errors
    replaysOnErrorSampleRate: 1.0,

    // Sample 20% of transactions for performance monitoring
    tracesSampleRate: 0.2,

    integrations: [
        Sentry.replayIntegration(),
    ],

    // Strip PII from error reports
    beforeSend(event) {
        if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
        }
        return event;
    },
});
