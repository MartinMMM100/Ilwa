import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';

import type { AssistanceContacts } from '../assistance/contacts';
import type {
  AssistanceRequestDocument,
  AssistanceRequestRepository,
  HelpResponse,
  ThirdPartyAssistanceCall,
} from '../assistance/model';
import { createApp } from '../app';
import { TestIncidentRepository } from './testRepository';

const contacts: AssistanceContacts = {
  primary: { id: 'saps-test', name: 'SAPS test line', phoneNumber: '+27110000001' },
  demoMode: false,
  thirdParties: [
    {
      id: 'far-response-team',
      name: 'Far Response Team',
      phoneNumber: '+27110000003',
      latitude: -26.25,
      longitude: 28.1,
      active: true,
      areaIds: [],
    },
    {
      id: 'near-response-team',
      name: 'Near Response Team',
      phoneNumber: '+27110000002',
      latitude: -26.193,
      longitude: 28.0342,
      active: true,
      areaIds: ['braamfontein'],
    },
  ],
};

test('assistance flow saves the first outcome and nearest third-party call', async () => {
  const incidents = new TestIncidentRepository();
  const assistance = new TestAssistanceRepository();
  const app = createApp({
    repository: incidents,
    assistanceRepository: assistance,
    assistanceContacts: contacts,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const startResponse = await fetch(`${baseUrl}/api/assistance-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportingSessionId: 'assistance-session-001',
        areaId: 'braamfontein',
      }),
    });
    assert.equal(startResponse.status, 201);
    const startBody = (await startResponse.json()) as {
      assistance: { requestId: string };
      contact: { name: string; phoneNumber: string };
      demoMode: boolean;
    };
    assert.equal(startBody.contact.name, 'SAPS test line');
    assert.equal(startBody.contact.phoneNumber, '+27110000001');
    assert.equal(startBody.demoMode, false);
    assert.equal(assistance.documents.size, 1);

    const prematureFallback = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/third-party-call`,
      { method: 'POST' },
    );
    assert.equal(prematureFallback.status, 409);

    const outcomeResponse = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/primary-outcome`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answered: false, helpResponse: 'not_coming' }),
      },
    );
    assert.equal(outcomeResponse.status, 200);
    const outcomeBody = (await outcomeResponse.json()) as {
      needsFallback: boolean;
      fallbackContact: { id: string; name: string; distanceMeters: number };
    };
    assert.equal(outcomeBody.needsFallback, true);
    assert.equal(outcomeBody.fallbackContact.id, 'near-response-team');
    assert.ok(outcomeBody.fallbackContact.distanceMeters < 100);

    const fallbackResponse = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/third-party-call`,
      { method: 'POST' },
    );
    assert.equal(fallbackResponse.status, 200);
    const fallbackBody = (await fallbackResponse.json()) as {
      contact: { id: string; phoneNumber: string };
    };
    assert.equal(fallbackBody.contact.id, 'near-response-team');
    assert.equal(fallbackBody.contact.phoneNumber, '+27110000002');

    const stored = assistance.documents.get(startBody.assistance.requestId);
    assert.equal(stored?.primaryCall.answered, false);
    assert.equal(stored?.primaryCall.helpResponse, 'not_coming');
    assert.equal(stored?.thirdPartyCall?.contactId, 'near-response-team');
    assert.equal(stored?.status, 'third_party_call_started');

    const incidentResponse = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description:
          'Two people robbed me near Park Station and one person was carrying a knife.',
        submissionId: 'assistance-linked-incident-001',
      }),
    });
    assert.equal(incidentResponse.status, 201);
    const incidentBody = (await incidentResponse.json()) as { report: { reference: string } };
    const linkResponse = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/report`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportReference: incidentBody.report.reference }),
      },
    );
    assert.equal(linkResponse.status, 204);
    assert.equal(
      assistance.documents.get(startBody.assistance.requestId)?.reportReference,
      incidentBody.report.reference,
    );
  });
});

test('assistance flow stops fallback when the first responder is coming', async () => {
  const assistance = new TestAssistanceRepository();
  const app = createApp({
    repository: new TestIncidentRepository(),
    assistanceRepository: assistance,
    assistanceContacts: contacts,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const startResponse = await fetch(`${baseUrl}/api/assistance-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportingSessionId: 'assistance-session-002', areaId: 'parktown' }),
    });
    const startBody = (await startResponse.json()) as { assistance: { requestId: string } };

    const outcomeResponse = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/primary-outcome`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answered: true, helpResponse: 'coming' }),
      },
    );
    assert.equal(outcomeResponse.status, 200);
    assert.deepEqual(
      await outcomeResponse.json(),
      {
        assistance: {
          requestId: startBody.assistance.requestId,
          status: 'primary_outcome_recorded',
        },
        needsFallback: false,
        fallbackContact: null,
      },
    );

    const fallbackResponse = await fetch(
      `${baseUrl}/api/assistance-requests/${startBody.assistance.requestId}/third-party-call`,
      { method: 'POST' },
    );
    assert.equal(fallbackResponse.status, 409);
  });
});

test('assistance request is not created until a test number is configured', async () => {
  const assistance = new TestAssistanceRepository();
  const app = createApp({
    repository: new TestIncidentRepository(),
    assistanceRepository: assistance,
    assistanceContacts: { primary: null, thirdParties: [], demoMode: false },
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assistance-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportingSessionId: 'assistance-session-003', areaId: 'newtown' }),
    });
    assert.equal(response.status, 503);
    assert.equal(assistance.documents.size, 0);
  });
});

class TestAssistanceRepository implements AssistanceRequestRepository {
  readonly documents = new Map<string, AssistanceRequestDocument>();

  async ensureIndexes() {}

  async startPrimaryCall(request: AssistanceRequestDocument) {
    const existing = [...this.documents.values()].find(
      (candidate) =>
        candidate.reporterId === request.reporterId &&
        candidate.reportingSessionId === request.reportingSessionId,
    );
    if (existing) return cloneRequest(existing);
    this.documents.set(request.requestId, cloneRequest(request));
    return cloneRequest(request);
  }

  async findByRequestId(requestId: string, reporterId: string) {
    const request = this.documents.get(requestId);
    return request?.reporterId === reporterId ? cloneRequest(request) : null;
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
    const request = this.documents.get(requestId);
    if (!request || request.reporterId !== reporterId) return null;
    request.primaryCall.answered = outcome.answered;
    request.primaryCall.helpResponse = outcome.helpResponse;
    request.primaryCall.confirmedAt = new Date(outcome.confirmedAt);
    request.status = 'primary_outcome_recorded';
    request.updatedAt = new Date(outcome.updatedAt);
    return cloneRequest(request);
  }

  async recordThirdPartyCall(
    requestId: string,
    reporterId: string,
    call: ThirdPartyAssistanceCall,
    updatedAt: Date,
  ) {
    const request = this.documents.get(requestId);
    if (!request || request.reporterId !== reporterId) return null;
    request.thirdPartyCall = { ...call, initiatedAt: new Date(call.initiatedAt) };
    request.status = 'third_party_call_started';
    request.updatedAt = new Date(updatedAt);
    return cloneRequest(request);
  }

  async linkReport(
    requestId: string,
    reporterId: string,
    reportReference: string,
    updatedAt: Date,
  ) {
    const request = this.documents.get(requestId);
    if (!request || request.reporterId !== reporterId) return false;
    request.reportReference = reportReference;
    request.updatedAt = new Date(updatedAt);
    return true;
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

async function withServer(server: Server, callback: (baseUrl: string) => Promise<void>) {
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose a TCP port.');
  }
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
