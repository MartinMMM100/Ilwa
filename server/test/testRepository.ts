import { DuplicateSubmissionError } from '../incidents/mongoRepository';
import type { IncidentDetails } from '../incidents/schema';
import type {
  IncidentDocument,
  IncidentPhotoMetadata,
  IncidentRepository,
  StoredIncident,
} from '../incidents/model';
import type {
  ThreatAssessmentMethod,
  ThreatLevel,
} from '../incidents/threatAssessment';

export class TestIncidentRepository implements IncidentRepository {
  readonly documents = new Map<string, IncidentDocument>();

  async ensureIndexes() {}

  async insertPending(incident: IncidentDocument): Promise<StoredIncident> {
    if (this.documents.has(incident.submissionId)) {
      throw new DuplicateSubmissionError();
    }
    this.documents.set(incident.submissionId, cloneIncident(incident));
    return toStoredIncident(incident);
  }

  async findBySubmissionId(submissionId: string): Promise<StoredIncident | null> {
    const incident = this.documents.get(submissionId);
    return incident ? toStoredIncident(incident) : null;
  }

  async findByReportReference(reportReference: string): Promise<IncidentDocument | null> {
    const incident = [...this.documents.values()].find(
      (candidate) => candidate.reportReference === reportReference,
    );
    return incident ? cloneIncident(incident) : null;
  }

  async completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean | null,
    threatLevel: ThreatLevel,
    threatAssessmentMethod: ThreatAssessmentMethod,
    updatedAt: Date,
  ) {
    const incident = this.findByReference(reportReference);
    incident.extractedDetails = { ...details, itemsTaken: [...details.itemsTaken] };
    incident.extractionStatus = 'completed';
    incident.extractionFixtureMatched = fixtureMatched;
    incident.threatLevel = threatLevel;
    incident.threatAssessmentMethod = threatAssessmentMethod;
    incident.threatAssessedAt = updatedAt;
    incident.updatedAt = updatedAt;
  }

  async failExtraction(reportReference: string, updatedAt: Date) {
    const incident = this.findByReference(reportReference);
    incident.extractedDetails = null;
    incident.extractionStatus = 'failed';
    incident.extractionFixtureMatched = null;
    incident.threatLevel = 'unknown';
    incident.threatAssessmentMethod = null;
    incident.threatAssessedAt = null;
    incident.updatedAt = updatedAt;
  }

  async attachPhoto(
    reportReference: string,
    reporterId: string,
    photo: IncidentPhotoMetadata,
    updatedAt: Date,
  ) {
    const incident = [...this.documents.values()].find(
      (candidate) =>
        candidate.reportReference === reportReference && candidate.reporterId === reporterId,
    );
    if (!incident) {
      return false;
    }
    incident.photo = { ...photo };
    incident.updatedAt = updatedAt;
    return true;
  }

  async listAdminIncidents(): Promise<IncidentDocument[]> {
    return [...this.documents.values()]
      .map(cloneIncident)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  async listPublicFeed(limit: number): Promise<IncidentDocument[]> {
    return [...this.documents.values()]
      .filter(
        (incident) =>
          incident.extractionStatus === 'completed' && incident.extractedDetails !== null,
      )
      .map(cloneIncident)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
      .slice(0, limit);
  }

  private findByReference(reportReference: string) {
    const incident = [...this.documents.values()].find(
      (candidate) => candidate.reportReference === reportReference,
    );
    if (!incident) {
      throw new Error('Test incident was not found.');
    }
    return incident;
  }
}

function cloneIncident(incident: IncidentDocument): IncidentDocument {
  return {
    ...incident,
    reportedAt: new Date(incident.reportedAt),
    updatedAt: new Date(incident.updatedAt),
    threatAssessedAt: incident.threatAssessedAt
      ? new Date(incident.threatAssessedAt)
      : null,
    extractedDetails: incident.extractedDetails
      ? { ...incident.extractedDetails, itemsTaken: [...incident.extractedDetails.itemsTaken] }
      : null,
    photo: incident.photo ? { ...incident.photo } : incident.photo,
  };
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
