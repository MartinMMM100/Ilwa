import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';

import { createApp } from '../app';
import type { IncidentDocument } from '../incidents/model';
import { TestIncidentRepository } from './testRepository';

test('GET /api/feed returns recent completed incidents as sanitized public items', async () => {
  const repository = new TestIncidentRepository();
  await repository.insertPending(
    makeIncident({
      submissionId: 'feed-submission-older',
      reportReference: 'ILWA-FEED-OLDER',
      reportedAt: new Date('2026-09-29T08:00:00.000Z'),
      category: 'infrastructure_fault',
      locationText: 'on Juta Street',
      threatLevel: 'low',
    }),
  );
  await repository.insertPending(
    makeIncident({
      submissionId: 'feed-submission-newer',
      reportReference: 'ILWA-FEED-NEWER',
      reportedAt: new Date('2026-09-30T08:00:00.000Z'),
      category: 'robbery',
      locationText: 'near Park Station',
      threatLevel: 'high',
    }),
  );
  await repository.insertPending(
    makeIncident({
      submissionId: 'feed-submission-pending',
      reportReference: 'ILWA-FEED-PENDING',
      reportedAt: new Date('2026-09-30T09:00:00.000Z'),
      category: 'theft',
      locationText: 'near De Korte Street',
      threatLevel: 'unknown',
      extractionStatus: 'pending',
    }),
  );

  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/feed?limit=1`);
    assert.equal(response.status, 200);

    const data = (await response.json()) as { items: Record<string, unknown>[] };
    assert.equal(data.items.length, 1);
    assert.deepEqual(data.items[0], {
      id: 'ILWA-FEED-NEWER',
      category: 'Crime',
      incidentType: 'Robbery',
      title: 'Robbery reported near Park Station',
      location: 'near Park Station',
      details: {
        timeText: 'recently',
        itemsTaken: [],
        offenderCount: null,
        weaponReported: null,
        injuriesReported: null,
        isOngoing: null,
      },
      photoUrl: null,
      reportedAt: '2026-09-30T08:00:00.000Z',
      verificationStatus: 'unverified',
      threatLevel: 'high',
      isDemoData: false,
    });
    assert.equal('reporterId' in data.items[0]!, false);
    assert.equal('submissionId' in data.items[0]!, false);
    assert.equal('originalDescription' in data.items[0]!, false);
  });
});

test('GET /api/feed rejects an invalid limit', async () => {
  const app = createApp({
    repository: new TestIncidentRepository(),
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/feed?limit=100`);
    assert.equal(response.status, 400);
  });
});

function makeIncident(options: {
  submissionId: string;
  reportReference: string;
  reportedAt: Date;
  category: NonNullable<IncidentDocument['extractedDetails']>['category'];
  locationText: string;
  threatLevel: IncidentDocument['threatLevel'];
  extractionStatus?: IncidentDocument['extractionStatus'];
}): IncidentDocument {
  const extractionStatus = options.extractionStatus ?? 'completed';
  return {
    submissionId: options.submissionId,
    reportReference: options.reportReference,
    reporterId: 'private-reporter-id',
    originalDescription: 'A private resident narrative that must not enter the public feed.',
    reportedAt: options.reportedAt,
    updatedAt: options.reportedAt,
    status: 'submitted',
    verificationStatus: 'unverified',
    threatLevel: options.threatLevel,
    threatAssessmentMethod: extractionStatus === 'completed' ? 'rules-v1' : null,
    threatAssessedAt: extractionStatus === 'completed' ? options.reportedAt : null,
    extractionStatus,
    extractionMethod: 'mock-v1',
    extractionModel: null,
    extractionFixtureMatched: true,
    extractedDetails: {
      category: options.category,
      locationText: options.locationText,
      timeText: 'recently',
      itemsTaken: [],
      offenderCount: null,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: null,
    },
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
