import type { ObjectId } from 'mongodb';

import type { IncidentDetails } from './schema';

export type ExtractionStatus = 'pending' | 'completed' | 'failed';
export type ExtractionMethod = 'mock-v1' | 'openai-responses-v1';

export type IncidentDocument = {
  _id?: ObjectId;
  submissionId: string;
  reportReference: string;
  reporterId: string;
  isDemoData?: boolean;
  originalDescription: string;
  reportedAt: Date;
  updatedAt: Date;
  status: 'submitted';
  verificationStatus: 'unverified';
  extractionStatus: ExtractionStatus;
  extractionMethod: ExtractionMethod;
  extractionModel: string | null;
  extractionFixtureMatched: boolean | null;
  extractedDetails: IncidentDetails | null;
};

export type StoredIncident = Pick<
  IncidentDocument,
  | 'submissionId'
  | 'reportReference'
  | 'reporterId'
  | 'originalDescription'
  | 'status'
  | 'verificationStatus'
  | 'extractionStatus'
>;

export interface IncidentRepository {
  ensureIndexes(): Promise<void>;
  insertPending(incident: IncidentDocument): Promise<StoredIncident>;
  findBySubmissionId(submissionId: string): Promise<StoredIncident | null>;
  completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean | null,
    updatedAt: Date,
  ): Promise<void>;
  failExtraction(reportReference: string, updatedAt: Date): Promise<void>;
}
