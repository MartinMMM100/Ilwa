import { DuplicateSubmissionError } from '../incidents/mongoRepository';
import type { IncidentDetails } from '../incidents/schema';
import type { IncidentDocument, IncidentRepository, StoredIncident } from '../incidents/model';

export class TestIncidentRepository implements IncidentRepository {
  readonly documents = new Map<string, IncidentDocument>();

  async listMapIncidents(): Promise<IncidentDocument[]> {
    return [...this.documents.values()].filter((item) => item.isDemoData === true);
  }

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

  async completeExtraction(
    reportReference: string,
    details: IncidentDetails,
    fixtureMatched: boolean | null,
    updatedAt: Date,
  ) {
    const incident = this.findByReference(reportReference);
    incident.extractedDetails = { ...details, itemsTaken: [...details.itemsTaken] };
    incident.extractionStatus = 'completed';
    incident.extractionFixtureMatched = fixtureMatched;
    incident.updatedAt = updatedAt;
  }

  async failExtraction(reportReference: string, updatedAt: Date) {
    const incident = this.findByReference(reportReference);
    incident.extractedDetails = null;
    incident.extractionStatus = 'failed';
    incident.extractionFixtureMatched = null;
    incident.updatedAt = updatedAt;
  }

  async listAdminIncidents(): Promise<IncidentDocument[]> {
    return [...this.documents.values()]
      .map(cloneIncident)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
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
    extractedDetails: incident.extractedDetails
      ? { ...incident.extractedDetails, itemsTaken: [...incident.extractedDetails.itemsTaken] }
      : null,
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
