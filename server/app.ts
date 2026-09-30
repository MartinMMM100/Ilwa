import { suburbs } from '../shared/safetyMap';
import { aggregateDemoMap } from './map/aggregate';
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  findNearestThirdParty,
  type AssistanceContacts,
} from './assistance/contacts';
import type { AssistanceRequestRepository } from './assistance/model';
import {
  linkAssistanceReportSchema,
  primaryOutcomeSchema,
  startAssistanceRequestSchema,
} from './assistance/schema';
import type { ExtractionMethod, IncidentRepository } from './incidents/model';
import type { IncidentPhotoStore } from './incidents/photoStore';
import { toPublicFeedItem } from './incidents/publicFeed';
import { incidentRequestSchema } from './incidents/schema';
import {
  SavedIncidentStatusUnknownError,
  SubmissionConflictError,
  submitIncident,
} from './incidents/service';
import { createDevelopmentReporterMiddleware } from './middleware/developmentReporter';
import type { AudioTranscriber } from './transcription/openAiTranscriber';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.m4a',
  '.mp3',
  '.mp4',
  '.mpeg',
  '.mpga',
  '.ogg',
  '.wav',
  '.webm',
]);
const SUPPORTED_PHOTO_MEDIA_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

class UnsupportedAudioTypeError extends Error {
  constructor() {
    super('The recording must be an M4A, MP3, MP4, MPEG, OGG, WAV, or WebM audio file.');
    this.name = 'UnsupportedAudioTypeError';
  }
}

class UnsupportedPhotoTypeError extends Error {
  constructor() {
    super('The photo must be a JPEG, PNG, WebP, HEIC, or HEIF image.');
    this.name = 'UnsupportedPhotoTypeError';
  }
}

type AppOptions = {
  repository: IncidentRepository;
  assistanceRepository?: AssistanceRequestRepository;
  assistanceContacts?: AssistanceContacts;
  photoStore?: IncidentPhotoStore;
  environment?: NodeJS.ProcessEnv;
  reporterMiddleware?: RequestHandler;
  extractor?: (description: string) => Promise<unknown>;
  extractionMethod?: ExtractionMethod;
  extractionModel?: string | null;
  fixtureMatcher?: (description: string) => boolean;
  transcriber?: AudioTranscriber;
};

export function createApp(options: AppOptions) {
  const environment = options.environment ?? process.env;
  const reporterMiddleware =
    options.reporterMiddleware ?? createDevelopmentReporterMiddleware(environment);
  const requireReporter: RequestHandler = (request, response, next) => {
    if (!request.reporterId) {
      response.status(401).json({
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
      });
      return;
    }
    next();
  };
  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 0 },
    fileFilter(_request, file, callback) {
      if (!SUPPORTED_AUDIO_EXTENSIONS.has(extname(file.originalname).toLowerCase())) {
        callback(new UnsupportedAudioTypeError());
        return;
      }
      callback(null, true);
    },
  });
  const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
    fileFilter(_request, file, callback) {
      if (!SUPPORTED_PHOTO_MEDIA_TYPES.has(file.mimetype.toLowerCase())) {
        callback(new UnsupportedPhotoTypeError());
        return;
      }
      callback(null, true);
    },
  });
  const app = express();

  app.disable('x-powered-by');
  app.use(createCorsMiddleware(environment));
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/map/areas/:areaId', async (request, response) => {
    const area = suburbs.find((candidate) => candidate.id === request.params.areaId);
    if (!area) {
      response.status(404).json({ error: { code: 'UNKNOWN_AREA', message: 'This suburb is not in the pilot.' } });
      return;
    }
    try {
      const incidents = area.id === 'braamfontein' ? await options.repository.listMapIncidents() : [];
      response.json(aggregateDemoMap(incidents, area.id));
    } catch {
      response.status(503).json({ error: { code: 'MAP_UNAVAILABLE', message: 'Could not load area reports. Try again.' } });
    }
  });

  app.post(
    '/api/assistance-requests',
    reporterMiddleware,
    requireReporter,
    async (request, response) => {
      const parsedRequest = startAssistanceRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        response.status(400).json({
          error: {
            code: 'INVALID_ASSISTANCE_REQUEST',
            message: 'Provide a valid reporting session and pilot area.',
            fields: parsedRequest.error.flatten().fieldErrors,
          },
        });
        return;
      }

      const assistanceRepository = options.assistanceRepository;
      const primaryContact = options.assistanceContacts?.primary;
      if (!assistanceRepository || !primaryContact) {
        response.status(503).json({
          error: {
            code: 'ASSISTANCE_NOT_CONFIGURED',
            message: 'The assistance test number has not been configured yet.',
          },
        });
        return;
      }

      const now = new Date();
      try {
        const assistance = await assistanceRepository.startPrimaryCall({
          requestId: randomUUID(),
          reportingSessionId: parsedRequest.data.reportingSessionId,
          reportReference: null,
          reporterId: request.reporterId!,
          isDemoData: options.assistanceContacts?.demoMode ?? false,
          areaId: parsedRequest.data.areaId,
          status: 'primary_call_started',
          primaryCall: {
            contactId: primaryContact.id,
            name: primaryContact.name,
            phoneNumber: primaryContact.phoneNumber,
            initiatedAt: now,
            answered: null,
            helpResponse: null,
            confirmedAt: null,
          },
          thirdPartyCall: null,
          createdAt: now,
          updatedAt: now,
        });

        response.status(201).json({
          assistance: {
            requestId: assistance.requestId,
            reportingSessionId: assistance.reportingSessionId,
            status: assistance.status,
          },
          contact: {
            id: assistance.primaryCall.contactId,
            name: assistance.primaryCall.name,
            phoneNumber: assistance.primaryCall.phoneNumber,
          },
          demoMode: options.assistanceContacts?.demoMode ?? false,
        });
      } catch {
        response.status(503).json({
          error: {
            code: 'ASSISTANCE_STORAGE_UNAVAILABLE',
            message: 'The call attempt could not be saved. No call was opened.',
          },
        });
      }
    },
  );

  app.patch(
    '/api/assistance-requests/:requestId/primary-outcome',
    reporterMiddleware,
    requireReporter,
    async (request, response) => {
      const parsedRequest = primaryOutcomeSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        response.status(400).json({
          error: {
            code: 'INVALID_CALL_OUTCOME',
            message: 'Provide whether the call was answered and whether help is coming.',
            fields: parsedRequest.error.flatten().fieldErrors,
          },
        });
        return;
      }

      const assistanceRepository = options.assistanceRepository;
      if (!assistanceRepository) {
        response.status(503).json({
          error: { code: 'ASSISTANCE_NOT_CONFIGURED', message: 'Assistance storage is unavailable.' },
        });
        return;
      }
      const requestId = readPathParameter(request.params.requestId);
      if (!requestId) {
        response.status(400).json({
          error: { code: 'INVALID_ASSISTANCE_ID', message: 'The assistance request id is invalid.' },
        });
        return;
      }

      const now = new Date();
      try {
        const assistance = await assistanceRepository.recordPrimaryOutcome(
          requestId,
          request.reporterId!,
          { ...parsedRequest.data, confirmedAt: now, updatedAt: now },
        );
        if (!assistance) {
          response.status(404).json({
            error: { code: 'ASSISTANCE_NOT_FOUND', message: 'The assistance request was not found.' },
          });
          return;
        }

        const needsFallback = assistance.primaryCall.helpResponse !== 'coming';
        const area = suburbs.find((candidate) => candidate.id === assistance.areaId);
        const fallback =
          needsFallback && area
            ? findNearestThirdParty(options.assistanceContacts?.thirdParties ?? [], area)
            : null;
        response.status(200).json({
          assistance: { requestId: assistance.requestId, status: assistance.status },
          needsFallback,
          fallbackContact: fallback
            ? {
                id: fallback.contact.id,
                name: fallback.contact.name,
                distanceMeters: fallback.distanceMeters,
              }
            : null,
        });
      } catch {
        response.status(503).json({
          error: {
            code: 'ASSISTANCE_STORAGE_UNAVAILABLE',
            message: 'The call outcome could not be saved. Please retry.',
          },
        });
      }
    },
  );

  app.post(
    '/api/assistance-requests/:requestId/third-party-call',
    reporterMiddleware,
    requireReporter,
    async (request, response) => {
      const assistanceRepository = options.assistanceRepository;
      if (!assistanceRepository) {
        response.status(503).json({
          error: { code: 'ASSISTANCE_NOT_CONFIGURED', message: 'Assistance storage is unavailable.' },
        });
        return;
      }
      const requestId = readPathParameter(request.params.requestId);
      if (!requestId) {
        response.status(400).json({
          error: { code: 'INVALID_ASSISTANCE_ID', message: 'The assistance request id is invalid.' },
        });
        return;
      }

      try {
        const assistance = await assistanceRepository.findByRequestId(
          requestId,
          request.reporterId!,
        );
        if (!assistance) {
          response.status(404).json({
            error: { code: 'ASSISTANCE_NOT_FOUND', message: 'The assistance request was not found.' },
          });
          return;
        }
        if (!assistance.primaryCall.confirmedAt) {
          response.status(409).json({
            error: {
              code: 'PRIMARY_OUTCOME_REQUIRED',
              message: 'Record the first call outcome before calling another organization.',
            },
          });
          return;
        }
        if (assistance.primaryCall.helpResponse === 'coming') {
          response.status(409).json({
            error: {
              code: 'FALLBACK_NOT_REQUIRED',
              message: 'The first responder was recorded as coming to help.',
            },
          });
          return;
        }

        const area = suburbs.find((candidate) => candidate.id === assistance.areaId);
        const fallback = area
          ? findNearestThirdParty(options.assistanceContacts?.thirdParties ?? [], area)
          : null;
        if (!fallback) {
          response.status(404).json({
            error: {
              code: 'NO_FALLBACK_CONTACT',
              message: 'No active third-party organization is configured for this area.',
            },
          });
          return;
        }

        const now = new Date();
        const updated = await assistanceRepository.recordThirdPartyCall(
          assistance.requestId,
          request.reporterId!,
          {
            contactId: fallback.contact.id,
            name: fallback.contact.name,
            phoneNumber: fallback.contact.phoneNumber,
            distanceMeters: fallback.distanceMeters,
            initiatedAt: now,
          },
          now,
        );
        if (!updated) {
          response.status(404).json({
            error: { code: 'ASSISTANCE_NOT_FOUND', message: 'The assistance request was not found.' },
          });
          return;
        }

        response.status(200).json({
          assistance: { requestId: updated.requestId, status: updated.status },
          contact: {
            id: fallback.contact.id,
            name: fallback.contact.name,
            phoneNumber: fallback.contact.phoneNumber,
            distanceMeters: fallback.distanceMeters,
          },
          demoMode: options.assistanceContacts?.demoMode ?? false,
        });
      } catch {
        response.status(503).json({
          error: {
            code: 'ASSISTANCE_STORAGE_UNAVAILABLE',
            message: 'The third-party call could not be saved. No call was opened.',
          },
        });
      }
    },
  );

  app.patch(
    '/api/assistance-requests/:requestId/report',
    reporterMiddleware,
    requireReporter,
    async (request, response) => {
      const parsedRequest = linkAssistanceReportSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        response.status(400).json({
          error: { code: 'INVALID_REPORT_REFERENCE', message: 'Provide a valid report reference.' },
        });
        return;
      }
      if (!options.assistanceRepository) {
        response.status(503).json({
          error: { code: 'ASSISTANCE_NOT_CONFIGURED', message: 'Assistance storage is unavailable.' },
        });
        return;
      }
      const requestId = readPathParameter(request.params.requestId);
      if (!requestId) {
        response.status(400).json({
          error: { code: 'INVALID_ASSISTANCE_ID', message: 'The assistance request id is invalid.' },
        });
        return;
      }

      try {
        const incident = await options.repository.findByReportReference(
          parsedRequest.data.reportReference,
        );
        if (!incident || incident.reporterId !== request.reporterId) {
          response.status(404).json({
            error: { code: 'REPORT_NOT_FOUND', message: 'The report was not found.' },
          });
          return;
        }
        const linked = await options.assistanceRepository.linkReport(
          requestId,
          request.reporterId!,
          incident.reportReference,
          new Date(),
        );
        if (!linked) {
          response.status(404).json({
            error: { code: 'ASSISTANCE_NOT_FOUND', message: 'The assistance request was not found.' },
          });
          return;
        }
        response.status(204).end();
      } catch {
        response.status(503).json({
          error: {
            code: 'ASSISTANCE_STORAGE_UNAVAILABLE',
            message: 'The assistance request could not be linked to the report.',
          },
        });
      }
    },
  );

  app.post('/api/incidents', reporterMiddleware, requireReporter, async (request, response) => {
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

    try {
      const result = await submitIncident(
        {
          reporterId: request.reporterId!,
          description: parsedRequest.data.description,
          submissionId: parsedRequest.data.submissionId,
        },
        {
          repository: options.repository,
          extractor: options.extractor,
          extractionMethod: options.extractionMethod,
          extractionModel: options.extractionModel,
          fixtureMatcher: options.fixtureMatcher,
        },
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

  app.post(
    '/api/incidents/:reportReference/photo',
    reporterMiddleware,
    requireReporter,
    photoUpload.single('photo'),
    async (request, response) => {
      if (!options.photoStore) {
        response.status(503).json({
          error: {
            code: 'PHOTO_STORAGE_UNAVAILABLE',
            message: 'Photo storage is not configured on this server.',
          },
        });
        return;
      }
      if (!request.file) {
        response.status(400).json({
          error: { code: 'PHOTO_REQUIRED', message: 'Attach one incident photo.' },
        });
        return;
      }
      const reportReference = request.params.reportReference;
      if (typeof reportReference !== 'string') {
        response.status(400).json({
          error: { code: 'INVALID_REFERENCE', message: 'Provide a valid report reference.' },
        });
        return;
      }

      try {
        const incident = await options.repository.findByReportReference(reportReference);
        if (!incident || incident.reporterId !== request.reporterId) {
          response.status(404).json({
            error: { code: 'INCIDENT_NOT_FOUND', message: 'That incident could not be found.' },
          });
          return;
        }

        await options.photoStore.save(incident.reportReference, {
          bytes: request.file.buffer,
          fileName: request.file.originalname,
          mediaType: request.file.mimetype,
        });
        const attached = await options.repository.attachPhoto(
          incident.reportReference,
          request.reporterId!,
          {
            fileName: request.file.originalname,
            mediaType: request.file.mimetype,
            byteLength: request.file.size,
          },
          new Date(),
        );
        if (!attached) {
          await options.photoStore.delete(incident.reportReference);
          response.status(404).json({
            error: { code: 'INCIDENT_NOT_FOUND', message: 'That incident could not be found.' },
          });
          return;
        }

        response.status(201).json({
          photo: { url: `/api/feed/${encodeURIComponent(incident.reportReference)}/photo` },
        });
      } catch {
        response.status(500).json({
          error: { code: 'PHOTO_UPLOAD_FAILED', message: 'The incident photo could not be saved.' },
        });
      }
    },
  );

  app.post(
    '/api/transcriptions',
    reporterMiddleware,
    requireReporter,
    audioUpload.single('audio'),
    async (request, response) => {
      if (!options.transcriber) {
        response.status(503).json({
          error: {
            code: 'TRANSCRIPTION_UNAVAILABLE',
            message: 'Voice transcription is not configured on this server.',
          },
        });
        return;
      }

      if (!request.file) {
        response.status(400).json({
          error: { code: 'AUDIO_REQUIRED', message: 'Attach one audio recording to transcribe.' },
        });
        return;
      }

      try {
        const transcript = await options.transcriber({
          bytes: request.file.buffer,
          fileName: request.file.originalname,
          mediaType: request.file.mimetype,
        });
        response.status(200).json({ transcript });
      } catch {
        response.status(502).json({
          error: {
            code: 'TRANSCRIPTION_FAILED',
            message: 'The recording could not be transcribed. You can retry the recording.',
          },
        });
      }
    },
  );

  app.get('/api/feed', async (request, response) => {
    const limit = parseFeedLimit(request.query.limit);
    if (limit === null) {
      response.status(400).json({
        error: {
          code: 'INVALID_FEED_LIMIT',
          message: 'Feed limit must be a whole number between 1 and 50.',
        },
      });
      return;
    }

    try {
      const incidents = await options.repository.listPublicFeed(limit);
      const items = incidents
        .map(toPublicFeedItem)
        .filter((item) => item !== null);

      response.status(200).json({ items });
    } catch {
      response.status(500).json({
        error: {
          code: 'FEED_FETCH_FAILED',
          message: 'The live feed could not be retrieved.',
        },
      });
    }
  });

  app.get('/api/feed/:reportReference/photo', async (request, response) => {
    if (!options.photoStore) {
      response.status(404).json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' } });
      return;
    }
    const reportReference = request.params.reportReference;
    if (typeof reportReference !== 'string') {
      response.status(404).json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' } });
      return;
    }

    try {
      const incident = await options.repository.findByReportReference(reportReference);
      if (
        !incident ||
        incident.extractionStatus !== 'completed' ||
        !incident.extractedDetails ||
        !incident.photo
      ) {
        response.status(404).json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' } });
        return;
      }

      const photo = await options.photoStore.find(incident.reportReference);
      if (!photo) {
        response.status(404).json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found.' } });
        return;
      }

      response.setHeader('Content-Type', photo.mediaType);
      response.setHeader('Cache-Control', 'public, max-age=300');
      response.status(200).send(photo.bytes);
    } catch {
      response.status(500).json({
        error: { code: 'PHOTO_FETCH_FAILED', message: 'The incident photo could not be retrieved.' },
      });
    }
  });

  app.get('/api/admin/incidents', async (_request, response) => {
    try {
      if (!options.repository.listAdminIncidents) {
        response.status(501).json({
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Incident listing is not supported by this repository.',
          },
        });
        return;
      }

      const incidents = await options.repository.listAdminIncidents();
      response.status(200).json({ incidents });
    } catch {
      response.status(500).json({
        error: {
          code: 'INCIDENT_FETCH_FAILED',
          message: 'The incidents could not be retrieved from the database.',
        },
      });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      const isPhoto = error.field === 'photo';
      response.status(413).json({
        error: {
          code: isPhoto ? 'PHOTO_TOO_LARGE' : 'AUDIO_TOO_LARGE',
          message: isPhoto
            ? 'The photo must be 5 MB or smaller.'
            : 'The recording must be 25 MB or smaller.',
        },
      });
      return;
    }

    if (error instanceof UnsupportedAudioTypeError) {
      response.status(400).json({
        error: { code: 'UNSUPPORTED_AUDIO_TYPE', message: error.message },
      });
      return;
    }

    if (error instanceof UnsupportedPhotoTypeError) {
      response.status(400).json({
        error: { code: 'UNSUPPORTED_PHOTO_TYPE', message: error.message },
      });
      return;
    }

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

function parseFeedLimit(value: unknown) {
  if (value === undefined) {
    return 30;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : null;
}

function readPathParameter(value: string | string[] | undefined) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 100 ? value : null;
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
