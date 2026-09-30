import { randomUUID } from 'node:crypto';

import { didMatchMockFixture, extractIncident } from './mockExtractor';
import { DuplicateSubmissionError } from './mongoRepository';
import type {
  ExtractionMethod,
  ExtractionStatus,
  IncidentDocument,
  IncidentRepository,
} from './model';
import { incidentDetailsSchema } from './schema';
import { assessIncidentThreat } from './threatAssessment';

export class SubmissionConflictError extends Error {
  constructor() {
    super('The submission identifier is already associated with another report.');
    this.name = 'SubmissionConflictError';
  }
}

export class SavedIncidentStatusUnknownError extends Error {
  constructor(readonly reportReference: string) {
    super('The report was saved, but its extraction status could not be updated.');
    this.name = 'SavedIncidentStatusUnknownError';
  }
}

type Extractor = (description: string) => Promise<unknown>;

type SubmitIncidentDependencies = {
  repository: IncidentRepository;
  extractor?: Extractor;
  fixtureMatcher?: (description: string) => boolean;
  extractionMethod?: ExtractionMethod;
  extractionModel?: string | null;
  clock?: () => Date;
  referenceFactory?: () => string;
};

export type SubmitIncidentResult = {
  reportReference: string;
  extractionStatus: ExtractionStatus;
  duplicate: boolean;
};

export async function submitIncident(
  input: {
    reporterId: string;
    description: string;
    submissionId: string;
    isDemoData?: boolean;
    mapLocationId?: string;
  },
  dependencies: SubmitIncidentDependencies,
): Promise<SubmitIncidentResult> {
  const clock = dependencies.clock ?? (() => new Date());
  const extractor = dependencies.extractor ?? extractIncident;
  const extractionMethod = dependencies.extractionMethod ?? 'mock-v1';
  const extractionModel = dependencies.extractionModel ?? null;
  const fixtureMatcher =
    dependencies.fixtureMatcher ??
    (extractionMethod === 'mock-v1' ? didMatchMockFixture : undefined);
  const reportReference =
    dependencies.referenceFactory?.() ??
    `ILWA-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const reportedAt = clock();

  const incident: IncidentDocument = {
    submissionId: input.submissionId,
    reportReference,
    reporterId: input.reporterId,
    isDemoData: input.isDemoData ?? false,
    ...(input.mapLocationId ? { mapLocationId: input.mapLocationId } : {}),
    originalDescription: input.description,
    reportedAt,
    updatedAt: reportedAt,
    status: 'submitted',
    verificationStatus: 'unverified',
    threatLevel: 'unknown',
    threatAssessmentMethod: null,
    threatAssessedAt: null,
    extractionStatus: 'pending',
    extractionMethod,
    extractionModel,
    extractionFixtureMatched: null,
    extractedDetails: null,
    photo: null,
  };

  try {
    await dependencies.repository.insertPending(incident);
  } catch (error) {
    if (!(error instanceof DuplicateSubmissionError)) {
      throw error;
    }

    const existing = await dependencies.repository.findBySubmissionId(input.submissionId);
    if (
      !existing ||
      existing.reporterId !== input.reporterId ||
      existing.originalDescription !== input.description
    ) {
      throw new SubmissionConflictError();
    }

    return {
      reportReference: existing.reportReference,
      extractionStatus: existing.extractionStatus,
      duplicate: true,
    };
  }

  let details;
  try {
    details = incidentDetailsSchema.parse(await extractor(input.description));
  } catch {
    return markExtractionFailed(dependencies.repository, reportReference, clock);
  }

  try {
    const assessment = assessIncidentThreat(details);
    await dependencies.repository.completeExtraction(
      reportReference,
      details,
      fixtureMatcher?.(input.description) ?? null,
      assessment.level,
      assessment.method,
      clock(),
    );
    return { reportReference, extractionStatus: 'completed', duplicate: false };
  } catch {
    return markExtractionFailed(dependencies.repository, reportReference, clock);
  }
}

async function markExtractionFailed(
  repository: IncidentRepository,
  reportReference: string,
  clock: () => Date,
): Promise<SubmitIncidentResult> {
  try {
    await repository.failExtraction(reportReference, clock());
    return { reportReference, extractionStatus: 'failed', duplicate: false };
  } catch {
    throw new SavedIncidentStatusUnknownError(reportReference);
  }
}
