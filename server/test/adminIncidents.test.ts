import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';

import { createApp } from '../app';
import type { IncidentDocument } from '../incidents/model';
import { TestIncidentRepository } from './testRepository';

test('GET /api/admin/incidents returns all stored incidents ordered by reportedAt desc', async () => {
  const repository = new TestIncidentRepository();
  const incidentA: IncidentDocument = {
    submissionId: 'test-sub-1',
    reportReference: 'ILWA-TEST-001',
    reporterId: 'reporter-1',
    originalDescription: 'Report description number one near Park Station.',
    reportedAt: new Date('2026-09-28T10:00:00.000Z'),
    updatedAt: new Date('2026-09-28T10:01:00.000Z'),
    status: 'submitted',
    verificationStatus: 'unverified',
    extractionStatus: 'completed',
    extractionMethod: 'mock-v1',
    extractionModel: null,
    extractionFixtureMatched: true,
    extractedDetails: {
      category: 'robbery',
      locationText: 'near Park Station',
      timeText: 'this morning',
      itemsTaken: ['phone'],
      offenderCount: 2,
      weaponReported: 'knife',
      injuriesReported: null,
      isOngoing: null,
    },
  };

  const incidentB: IncidentDocument = {
    submissionId: 'test-sub-2',
    reportReference: 'ILWA-TEST-002',
    reporterId: 'reporter-2',
    originalDescription: 'Report description number two on Juta Street.',
    reportedAt: new Date('2026-09-29T12:00:00.000Z'),
    updatedAt: new Date('2026-09-29T12:01:00.000Z'),
    status: 'submitted',
    verificationStatus: 'unverified',
    extractionStatus: 'completed',
    extractionMethod: 'mock-v1',
    extractionModel: null,
    extractionFixtureMatched: true,
    extractedDetails: {
      category: 'theft',
      locationText: 'on Juta Street',
      timeText: 'yesterday afternoon',
      itemsTaken: ['backpack'],
      offenderCount: 1,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: null,
    },
  };

  await repository.insertPending(incidentA);
  await repository.insertPending(incidentB);

  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/incidents`);
    assert.equal(response.status, 200);

    const data = (await response.json()) as { incidents: IncidentDocument[] };
    assert.ok(Array.isArray(data.incidents));
    assert.equal(data.incidents.length, 2);
    // Should be sorted latest first (incidentB reported at Sep 29, incidentA reported at Sep 28)
    assert.equal(data.incidents[0]?.reportReference, 'ILWA-TEST-002');
    assert.equal(data.incidents[1]?.reportReference, 'ILWA-TEST-001');
    assert.equal(data.incidents[0]?.extractedDetails?.category, 'theft');
  });
});

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
