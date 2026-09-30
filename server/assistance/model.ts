import type { ObjectId } from 'mongodb';

export type HelpResponse = 'coming' | 'not_coming' | 'unsure';

export type AssistanceCallTarget = {
  contactId: string;
  name: string;
  phoneNumber: string;
};

export type PrimaryAssistanceCall = AssistanceCallTarget & {
  initiatedAt: Date;
  answered: boolean | null;
  helpResponse: HelpResponse | null;
  confirmedAt: Date | null;
};

export type ThirdPartyAssistanceCall = AssistanceCallTarget & {
  distanceMeters: number;
  initiatedAt: Date;
};

export type AssistanceRequestStatus =
  | 'primary_call_started'
  | 'primary_outcome_recorded'
  | 'third_party_call_started';

export type AssistanceRequestDocument = {
  _id?: ObjectId;
  requestId: string;
  reportingSessionId: string;
  reportReference: string | null;
  reporterId: string;
  isDemoData: boolean;
  areaId: string;
  status: AssistanceRequestStatus;
  primaryCall: PrimaryAssistanceCall;
  thirdPartyCall: ThirdPartyAssistanceCall | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface AssistanceRequestRepository {
  ensureIndexes(): Promise<void>;
  startPrimaryCall(
    request: AssistanceRequestDocument,
  ): Promise<AssistanceRequestDocument>;
  findByRequestId(
    requestId: string,
    reporterId: string,
  ): Promise<AssistanceRequestDocument | null>;
  recordPrimaryOutcome(
    requestId: string,
    reporterId: string,
    outcome: {
      answered: boolean;
      helpResponse: HelpResponse;
      confirmedAt: Date;
      updatedAt: Date;
    },
  ): Promise<AssistanceRequestDocument | null>;
  recordThirdPartyCall(
    requestId: string,
    reporterId: string,
    call: ThirdPartyAssistanceCall,
    updatedAt: Date,
  ): Promise<AssistanceRequestDocument | null>;
  linkReport(
    requestId: string,
    reporterId: string,
    reportReference: string,
    updatedAt: Date,
  ): Promise<boolean>;
}
