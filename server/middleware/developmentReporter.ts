import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      reporterId?: string;
    }
  }
}

export function createDevelopmentReporterMiddleware(
  environment: NodeJS.ProcessEnv,
): RequestHandler {
  if (environment.NODE_ENV === 'production') {
    throw new Error(
      'Development-only reporter identity is disabled in production. Configure real authentication first.',
    );
  }

  const reporterId = environment.DEV_REPORTER_ID?.trim() || 'development-only-resident';

  return (request, _response, next) => {
    request.reporterId = reporterId;
    next();
  };
}
