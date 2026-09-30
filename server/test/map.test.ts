import assert from 'node:assert/strict';
import test from 'node:test';
import type { IncidentDocument } from '../incidents/model';
import { aggregateDemoMap } from '../map/aggregate';

const now = new Date('2026-09-30T10:00:00Z');
function incident(overrides: Partial<IncidentDocument> = {}): IncidentDocument {
  return {
    submissionId: 'demo-map-1', reportReference: 'ILWA-DEMO-MAP', reporterId: 'private-id',
    isDemoData: true, originalDescription: 'Private raw narrative', reportedAt: now, updatedAt: now,
    status: 'submitted', verificationStatus: 'unverified', extractionStatus: 'completed',
    extractionMethod: 'mock-v1', extractionModel: null, extractionFixtureMatched: true,
    extractedDetails: { category: 'robbery', locationText: 'near Park Station', timeText: null,
      itemsTaken: [], offenderCount: null, weaponReported: null, injuriesReported: null, isOngoing: null },
    ...overrides,
  };
}
test('demo map excludes private, unmapped, incomplete, future and stale reports', () => {
  const result = aggregateDemoMap([
    incident(), incident({ isDemoData: false }), incident({ isDemoData: undefined }),
    incident({ extractionStatus: 'failed' }), incident({ extractedDetails: null }),
    incident({ reportedAt: new Date(now.getTime() - 31 * 86_400_000) }),
    incident({ reportedAt: new Date(now.getTime() + 86_400_000) }),
    incident({ extractedDetails: { ...incident().extractedDetails!, locationText: 'an unknown location' } }),
  ], 'braamfontein', now);
  assert.equal(result.zones.length, 1);
  assert.equal(result.zones[0]?.reportCount, 1);
  assert.equal(JSON.stringify(result).includes('private-id'), false);
  assert.equal(JSON.stringify(result).includes('Private raw narrative'), false);
  assert.deepEqual(aggregateDemoMap([incident()], 'melville', now).zones, []);
});
test('demo concern strength decays with age and increases with clustered reports', () => {
  const fresh = aggregateDemoMap([incident()], 'braamfontein', now).zones[0]!;
  const older = aggregateDemoMap([incident({ reportedAt: new Date(now.getTime() - 14 * 86_400_000) })], 'braamfontein', now).zones[0]!;
  const cluster = aggregateDemoMap([incident(), incident()], 'braamfontein', now).zones[0]!;
  assert.equal(fresh.score, 5);
  assert.equal(older.score, 2.5);
  assert.equal(older.concern, 'lower');
  assert.equal(cluster.concern, 'higher');
  assert.ok(cluster.radiusMeters > fresh.radiusMeters);
});
