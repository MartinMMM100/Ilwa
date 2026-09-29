import { type Collection, MongoServerError } from 'mongodb';

import type { IncidentDetails } from './schema';
import type { IncidentDocument, IncidentRepository, StoredIncident } from './model';

export class DuplicateSubmissionError extends Error {
  constructor() {
    super('The submission identifier already exists.');
    this.name = 'DuplicateSubmissionError';
  }
}

export class MongoIncidentRepository implements IncidentRepository {
  constructor(private readonly incidents: Collection<IncidentDocument>) {}

  async ensureIndexes() {
    await Promise.all([
      this.incidents.createIndex({ submissionId: 1 }, { name: 'submission_id_unique', unique: true }),
      this.incidents.createIndex({ reportReference: 1 }, { name: 'report_reference_unique', unique: true }),
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

  async completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean,
    updatedAt: Date,
  ) {
    const result = await this.incidents.updateOne(
      { reportReference },
      {
        $set: {
          extractedDetails: details,
          extractionStatus: 'completed',
          extractionFixtureMatched: fixtureMatched,
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
          updatedAt,
        },
      },
    );

    if (result.matchedCount !== 1) {
      throw new Error('Saved incident could not be found for failure update.');
    }
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
