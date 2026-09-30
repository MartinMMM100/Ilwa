import type { ObjectId } from 'mongodb';

import type { IncidentDetails } from './schema';
import type { ThreatAssessmentMethod, ThreatLevel } from './threatAssessment';

export type ExtractionStatus = 'pending' | 'completed' | 'failed';
export type ExtractionMethod = 'mock-v1' | 'openai-responses-v1';

export type IncidentPhotoMetadata = {
  fileName: string;
  mediaType: string;
  byteLength: number;
};

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
  threatLevel: ThreatLevel;
  threatAssessmentMethod: ThreatAssessmentMethod | null;
  threatAssessedAt: Date | null;
  extractionStatus: ExtractionStatus;
  extractionMethod: ExtractionMethod;
  extractionModel: string | null;
  extractionFixtureMatched: boolean | null;
  extractedDetails: IncidentDetails | null;
  photo?: IncidentPhotoMetadata | null;
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
  listMapIncidents(): Promise<IncidentDocument[]>;
  ensureIndexes(): Promise<void>;
  insertPending(incident: IncidentDocument): Promise<StoredIncident>;
  findBySubmissionId(submissionId: string): Promise<StoredIncident | null>;
  findByReportReference(reportReference: string): Promise<IncidentDocument | null>;
  completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean | null,
    threatLevel: ThreatLevel,
    threatAssessmentMethod: ThreatAssessmentMethod,
    updatedAt: Date,
  ): Promise<void>;
  failExtraction(reportReference: string, updatedAt: Date): Promise<void>;
  attachPhoto(
    reportReference: string,
    reporterId: string,
    photo: IncidentPhotoMetadata,
    updatedAt: Date,
  ): Promise<boolean>;
  listPublicFeed(limit: number): Promise<IncidentDocument[]>;
  listAdminIncidents?(): Promise<IncidentDocument[]>;
}
