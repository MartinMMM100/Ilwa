import { type Collection, MongoServerError } from 'mongodb';

import type { IncidentDetails } from './schema';
import type {
  IncidentDocument,
  IncidentPhotoMetadata,
  IncidentRepository,
  StoredIncident,
  VerificationStatus,
} from './model';
import type { ThreatAssessmentMethod, ThreatLevel } from './threatAssessment';

export class DuplicateSubmissionError extends Error {
  constructor() {
    super('The submission identifier already exists.');
    this.name = 'DuplicateSubmissionError';
  }
}

export class MongoIncidentRepository implements IncidentRepository {
  constructor(private readonly incidents: Collection<IncidentDocument>) {}

  async listMapIncidents(): Promise<IncidentDocument[]> {
    return this.incidents.find({ $or: [{ isDemoData: true }, { mapLocationId: { $exists: true } }],
      extractionStatus: 'completed', verificationStatus: { $ne: 'dismissed' },
      reportedAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } }).toArray();
  }

  async ensureIndexes() {
    await Promise.all([
      this.incidents.createIndex({ submissionId: 1 }, { name: 'submission_id_unique', unique: true }),
      this.incidents.createIndex({ reportReference: 1 }, { name: 'report_reference_unique', unique: true }),
      this.incidents.createIndex(
        { isDemoData: 1, threatLevel: 1, reportedAt: -1 },
        { name: 'map_threat_recency' },
      ),
      this.incidents.createIndex(
        { extractionStatus: 1, reportedAt: -1 },
        { name: 'public_feed_recency' },
      ),
    ]);
  }

  async insertPending(incident: IncidentDocument): Promise<StoredIncident> {
    try {
      await this.incidents.insertOne(incident);
      return toStoredIncident(incident);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new DuplicateSubmissionError();
      }
      throw error;
    }
  }

  async findBySubmissionId(submissionId: string): Promise<StoredIncident | null> {
    const incident = await this.incidents.findOne({ submissionId });
    return incident ? toStoredIncident(incident) : null;
  }

  async findByReportReference(reportReference: string): Promise<IncidentDocument | null> {
    return this.incidents.findOne({ reportReference });
  }

  async completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean | null,
    threatLevel: ThreatLevel,
    threatAssessmentMethod: ThreatAssessmentMethod,
    updatedAt: Date,
  ) {
    const result = await this.incidents.updateOne(
      { reportReference },
      {
        $set: {
          extractedDetails: details,
          extractionStatus: 'completed',
          extractionFixtureMatched: fixtureMatched,
          threatLevel,
          threatAssessmentMethod,
          threatAssessedAt: updatedAt,
          updatedAt,
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error('Saved incident could not be found for extraction update.');
    }
  }

  async failExtraction(reportReference: string, updatedAt: Date) {
    const result = await this.incidents.updateOne(
      { reportReference },
      {
        $set: {
          extractionStatus: 'failed',
          extractionFixtureMatched: null,
          extractedDetails: null,
          threatLevel: 'unknown',
          threatAssessmentMethod: null,
          threatAssessedAt: null,
          updatedAt,
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error('Saved incident could not be found for failure update.');
    }
  }

  async attachPhoto(
    reportReference: string,
    reporterId: string,
    photo: IncidentPhotoMetadata,
    updatedAt: Date,
  ) {
    const result = await this.incidents.updateOne(
      { reportReference, reporterId },
      { $set: { photo, updatedAt } },
    );
    return result.matchedCount === 1;
  }

  async listAdminIncidents(): Promise<IncidentDocument[]> {
    return this.incidents.find({}).sort({ reportedAt: -1 }).toArray();
  }

  async setVerificationStatus(reportReference: string, status: VerificationStatus, updatedAt: Date) {
    const result = await this.incidents.updateOne(
      { reportReference },
      { $set: { verificationStatus: status, updatedAt } },
    );
    return result.matchedCount === 1;
  }

  async listPublicFeed(limit: number): Promise<IncidentDocument[]> {
    return this.incidents
      .find({ extractionStatus: 'completed', extractedDetails: { $ne: null }, verificationStatus: { $ne: 'dismissed' } })
      .sort({ reportedAt: -1 })
      .limit(limit)
      .toArray();
  }
}

function toStoredIncident(incident: IncidentDocument): StoredIncident {
  return {
    submissionId: incident.submissionId,
    reportReference: incident.reportReference,
    reporterId: incident.reporterId,
    originalDescription: incident.originalDescription,
    status: incident.status,
    verificationStatus: incident.verificationStatus,
    extractionStatus: incident.extractionStatus,
  };
}
