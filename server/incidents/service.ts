import { randomUUID } from 'node:crypto';

import { didMatchMockFixture, extractIncident } from './mockExtractor';
import { DuplicateSubmissionError } from './mongoRepository';
import type { ExtractionStatus, IncidentDocument, IncidentRepository } from './model';
import { incidentDetailsSchema } from './schema';

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
  clock?: () => Date;
  referenceFactory?: () => string;
};

export type SubmitIncidentResult = {
  reportReference: string;
  extractionStatus: ExtractionStatus;
  duplicate: boolean;
};

export async function submitIncident(
  input: { reporterId: string; description: string; submissionId: string },
  dependencies: SubmitIncidentDependencies,
): Promise<SubmitIncidentResult> {
  const clock = dependencies.clock ?? (() => new Date());
  const extractor = dependencies.extractor ?? extractIncident;
  const fixtureMatcher = dependencies.fixtureMatcher ?? didMatchMockFixture;
  const reportReference =
    dependencies.referenceFactory?.() ??
    `ILWA-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const reportedAt = clock();

  const incident: IncidentDocument = {
    submissionId: input.submissionId,
    reportReference,
    reporterId: input.reporterId,
    originalDescription: input.description,
    reportedAt,
    updatedAt: reportedAt,
    status: 'submitted',
    verificationStatus: 'unverified',
    extractionStatus: 'pending',
    extractionMethod: 'mock-v1',
    extractionFixtureMatched: null,
    extractedDetails: null,
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
    await dependencies.repository.completeExtraction(
      reportReference,
      details,
      fixtureMatcher(input.description),
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
