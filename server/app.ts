import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';

import type { IncidentRepository } from './incidents/model';
import { incidentRequestSchema } from './incidents/schema';
import {
  SavedIncidentStatusUnknownError,
  SubmissionConflictError,
  submitIncident,
} from './incidents/service';
import { createDevelopmentReporterMiddleware } from './middleware/developmentReporter';

type AppOptions = {
  repository: IncidentRepository;
  environment?: NodeJS.ProcessEnv;
  reporterMiddleware?: RequestHandler;
  extractor?: (description: string) => Promise<unknown>;
};

export function createApp(options: AppOptions) {
  const environment = options.environment ?? process.env;
  const reporterMiddleware =
    options.reporterMiddleware ?? createDevelopmentReporterMiddleware(environment);
  const app = express();

  app.disable('x-powered-by');
  app.use(createCorsMiddleware(environment));
  app.use(express.json({ limit: '16kb' }));

  app.post('/api/incidents', reporterMiddleware, async (request, response) => {
    const parsedRequest = incidentRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({
        error: {
          code: 'INVALID_INCIDENT',
          message: 'Provide a valid incident description and submission identifier.',
          fields: parsedRequest.error.flatten().fieldErrors,
        },
      });
      return;
    }

    if (!request.reporterId) {
      response.status(401).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
      });
      return;
    }

    try {
      const result = await submitIncident(
        {
          reporterId: request.reporterId,
          description: parsedRequest.data.description,
          submissionId: parsedRequest.data.submissionId,
        },
        { repository: options.repository, extractor: options.extractor },
      );

      response.status(result.duplicate ? 200 : 201).json({
        report: {
          reference: result.reportReference,
          status: 'submitted',
          verificationStatus: 'unverified',
          extractionStatus: result.extractionStatus,
        },
        duplicate: result.duplicate,
      });
    } catch (error) {
      if (error instanceof SubmissionConflictError) {
        response.status(409).json({
          error: {
            code: 'SUBMISSION_CONFLICT',
            message: 'That submission identifier is already in use.',
          },
        });
        return;
      }

      if (error instanceof SavedIncidentStatusUnknownError) {
        response.status(202).json({
          report: {
            reference: error.reportReference,
            status: 'submitted',
            verificationStatus: 'unverified',
            extractionStatus: 'pending',
          },
          duplicate: false,
          warning: 'The report was saved, but structured processing could not be confirmed.',
        });
        return;
      }

      response.status(503).json({
        error: {
          code: 'INCIDENT_STORAGE_UNAVAILABLE',
          message: 'The report could not be saved. Please retry with the same submission.',
        },
      });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof SyntaxError) {
      response.status(400).json({
        error: { code: 'INVALID_JSON', message: 'The request body must be valid JSON.' },
      });
      return;
    }

    if (error instanceof Error && error.message === 'Origin is not allowed.') {
      response.status(403).json({
        error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This request origin is not allowed.' },
      });
      return;
    }

    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'The request could not be processed.' },
    });
  };
  app.use(errorHandler);

  return app;
}

function createCorsMiddleware(environment: NodeJS.ProcessEnv) {
  const allowedOrigins = (environment.CLIENT_ORIGIN ?? 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed.'));
    },
  });
}
