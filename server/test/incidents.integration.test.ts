import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { MongoClient } from 'mongodb';

import type { IncidentDocument } from '../incidents/model';
import { MongoIncidentRepository } from '../incidents/mongoRepository';
import { submitIncident } from '../incidents/service';

const testMongoUri = process.env.MONGODB_TEST_URI;
const testDatabaseName = process.env.MONGODB_TEST_DB;
const hasTestDatabase = Boolean(testMongoUri && testDatabaseName);

test(
  'MongoDB stores one incident for a retried submission in a separate test database',
  { skip: hasTestDatabase ? false : 'MONGODB_TEST_URI and MONGODB_TEST_DB are not configured.' },
  async () => {
    assert.ok(testMongoUri);
    assert.ok(testDatabaseName);
    assert.notEqual(
      testDatabaseName,
      process.env.MONGODB_DB,
      'MONGODB_TEST_DB must not be the application database.',
    );

    const client = new MongoClient(testMongoUri, { appName: 'ilwa-incident-api-tests' });
    const submissionId = `integration-${randomUUID()}`;
    const collection = client.db(testDatabaseName).collection<IncidentDocument>('incidents');
    const repository = new MongoIncidentRepository(collection);

    try {
      await client.connect();
      await repository.ensureIndexes();

      const input = {
        reporterId: 'development-only-integration-resident',
        description:
          'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.',
        submissionId,
      };
      const first = await submitIncident(input, { repository });
      const retry = await submitIncident(input, { repository });

      assert.equal(await collection.countDocuments({ submissionId }), 1);
      assert.equal(retry.duplicate, true);
      assert.equal(retry.reportReference, first.reportReference);

      const stored = await collection.findOne({ submissionId });
      assert.ok(stored);
      assert.equal(stored.extractionStatus, 'completed');
      assert.equal(stored.extractionFixtureMatched, true);
      assert.equal(stored.verificationStatus, 'unverified');
      assert.equal(stored.extractedDetails?.category, 'robbery');
    } finally {
      await collection.deleteOne({ submissionId });
      await client.close();
    }
  },
);
