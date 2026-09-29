import assert from 'node:assert/strict';
import test from 'node:test';

import { submitIncident } from '../incidents/service';
import { TestIncidentRepository } from './testRepository';

const description =
  'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.';

test('extraction failure preserves the original report and marks extraction failed', async () => {
  const repository = new TestIncidentRepository();
  const timestamp = new Date('2026-09-29T08:00:00.000Z');

  const result = await submitIncident(
    {
      reporterId: 'development-only-test-resident',
      description,
      submissionId: 'submission-failure-1',
    },
    {
      repository,
      extractor: async () => {
        throw new Error('Synthetic extraction failure');
      },
      clock: () => new Date(timestamp),
      referenceFactory: () => 'ILWA-FAILURE001',
    },
  );

  assert.deepEqual(result, {
    reportReference: 'ILWA-FAILURE001',
    extractionStatus: 'failed',
    duplicate: false,
  });
  const stored = repository.documents.get('submission-failure-1');
  assert.ok(stored);
  assert.equal(stored.originalDescription, description);
  assert.equal(stored.status, 'submitted');
  assert.equal(stored.verificationStatus, 'unverified');
  assert.equal(stored.extractionStatus, 'failed');
  assert.equal(stored.extractedDetails, null);
});

test('retrying the same submission returns one saved report and runs extraction once', async () => {
  const repository = new TestIncidentRepository();
  let extractionCalls = 0;
  const extractor = async () => {
    extractionCalls += 1;
    return {
      category: 'other_unclear',
      locationText: null,
      timeText: null,
      itemsTaken: [],
      offenderCount: null,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: null,
    };
  };
  const input = {
    reporterId: 'development-only-test-resident',
    description: 'A fictional report used to verify duplicate submission handling.',
    submissionId: 'submission-duplicate-1',
  };

  const first = await submitIncident(input, {
    repository,
    extractor,
    referenceFactory: () => 'ILWA-DUPLICATE01',
  });
  const retry = await submitIncident(input, {
    repository,
    extractor,
    referenceFactory: () => 'ILWA-SHOULDNOTUSE',
  });

  assert.equal(repository.documents.size, 1);
  assert.equal(extractionCalls, 1);
  assert.equal(first.reportReference, 'ILWA-DUPLICATE01');
  assert.equal(
    repository.documents.get('submission-duplicate-1')?.extractionFixtureMatched,
    false,
  );
  assert.deepEqual(retry, {
    reportReference: 'ILWA-DUPLICATE01',
    extractionStatus: 'completed',
    duplicate: true,
  });
});

test('real AI extraction metadata is stored without claiming a mock fixture match', async () => {
  const repository = new TestIncidentRepository();
  const extractedDetails = {
    category: 'robbery' as const,
    locationText: 'near Park Station',
    timeText: 'last night around 9',
    itemsTaken: ['phone'],
    offenderCount: 2,
    weaponReported: 'knife',
    injuriesReported: null,
    isOngoing: null,
  };

  await submitIncident(
    {
      reporterId: 'development-only-test-resident',
      description,
      submissionId: 'submission-openai-1',
    },
    {
      repository,
      extractor: async () => extractedDetails,
      extractionMethod: 'openai-responses-v1',
      extractionModel: 'test-incident-model',
      referenceFactory: () => 'ILWA-OPENAI0001',
    },
  );

  const stored = repository.documents.get('submission-openai-1');
  assert.ok(stored);
  assert.equal(stored.extractionMethod, 'openai-responses-v1');
  assert.equal(stored.extractionModel, 'test-incident-model');
  assert.equal(stored.extractionFixtureMatched, null);
  assert.deepEqual(stored.extractedDetails, extractedDetails);
});
