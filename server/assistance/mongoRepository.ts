import { type Collection, MongoServerError } from 'mongodb';

import type {
  AssistanceRequestDocument,
  AssistanceRequestRepository,
  HelpResponse,
  ThirdPartyAssistanceCall,
} from './model';

export class MongoAssistanceRequestRepository implements AssistanceRequestRepository {
  constructor(private readonly requests: Collection<AssistanceRequestDocument>) {}

  async ensureIndexes() {
    await Promise.all([
      this.requests.createIndex(
        { requestId: 1 },
        { name: 'assistance_request_id_unique', unique: true },
      ),
      this.requests.createIndex(
        { reporterId: 1, reportingSessionId: 1 },
        { name: 'assistance_reporting_session_unique', unique: true },
      ),
      this.requests.createIndex(
        { reporterId: 1, createdAt: -1 },
        { name: 'assistance_reporter_recency' },
      ),
    ]);
  }

  async startPrimaryCall(request: AssistanceRequestDocument) {
    try {
      await this.requests.insertOne(request);
      return cloneRequest(request);
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) {
        throw error;
      }

      const existing = await this.requests.findOne({
        reporterId: request.reporterId,
        reportingSessionId: request.reportingSessionId,
      });
      if (!existing) throw error;
      return cloneRequest(existing);
    }
  }

  async findByRequestId(requestId: string, reporterId: string) {
    const request = await this.requests.findOne({ requestId, reporterId });
    return request ? cloneRequest(request) : null;
  }

  async recordPrimaryOutcome(
    requestId: string,
    reporterId: string,
    outcome: {
      answered: boolean;
      helpResponse: HelpResponse;
      confirmedAt: Date;
      updatedAt: Date;
    },
  ) {
    const request = await this.requests.findOneAndUpdate(
      { requestId, reporterId },
      {
        $set: {
          'primaryCall.answered': outcome.answered,
          'primaryCall.helpResponse': outcome.helpResponse,
          'primaryCall.confirmedAt': outcome.confirmedAt,
          status: 'primary_outcome_recorded',
          updatedAt: outcome.updatedAt,
        },
      },
      { returnDocument: 'after' },
    );
    return request ? cloneRequest(request) : null;
  }

  async recordThirdPartyCall(
    requestId: string,
    reporterId: string,
    call: ThirdPartyAssistanceCall,
    updatedAt: Date,
  ) {
    const request = await this.requests.findOneAndUpdate(
      { requestId, reporterId },
      {
        $set: {
          thirdPartyCall: call,
          status: 'third_party_call_started',
          updatedAt,
        },
      },
      { returnDocument: 'after' },
    );
    return request ? cloneRequest(request) : null;
  }

  async linkReport(
    requestId: string,
    reporterId: string,
    reportReference: string,
    updatedAt: Date,
  ) {
    const result = await this.requests.updateOne(
      { requestId, reporterId },
      { $set: { reportReference, updatedAt } },
    );
    return result.matchedCount === 1;
  }
}

function cloneRequest(request: AssistanceRequestDocument): AssistanceRequestDocument {
  return {
    ...request,
    primaryCall: {
      ...request.primaryCall,
      initiatedAt: new Date(request.primaryCall.initiatedAt),
      confirmedAt: request.primaryCall.confirmedAt
        ? new Date(request.primaryCall.confirmedAt)
        : null,
    },
    thirdPartyCall: request.thirdPartyCall
      ? { ...request.thirdPartyCall, initiatedAt: new Date(request.thirdPartyCall.initiatedAt) }
      : null,
    createdAt: new Date(request.createdAt),
    updatedAt: new Date(request.updatedAt),
  };
}
