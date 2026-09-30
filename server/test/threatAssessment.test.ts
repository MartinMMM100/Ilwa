import assert from 'node:assert/strict';
import test from 'node:test';

import type { IncidentDetails } from '../incidents/schema';
import { assessIncidentThreat } from '../incidents/threatAssessment';

const baseDetails: IncidentDetails = {
  category: 'other_unclear',
  locationText: null,
  timeText: null,
  itemsTaken: [],
  offenderCount: null,
  weaponReported: null,
  injuriesReported: null,
  isOngoing: null,
};

test('assigns critical to an ongoing violent incident', () => {
  assert.deepEqual(
    assessIncidentThreat({
      ...baseDetails,
      category: 'robbery',
      weaponReported: 'knife',
      isOngoing: true,
    }),
    { level: 'critical', method: 'rules-v1' },
  );
});

test('assigns high to a violent incident that is not reported as ongoing', () => {
  assert.equal(
    assessIncidentThreat({ ...baseDetails, category: 'assault', isOngoing: false }).level,
    'high',
  );
});

test('assigns medium to property crime or suspicious activity', () => {
  assert.equal(assessIncidentThreat({ ...baseDetails, category: 'theft' }).level, 'medium');
  assert.equal(
    assessIncidentThreat({ ...baseDetails, category: 'suspicious_activity' }).level,
    'medium',
  );
});

test('assigns low to an infrastructure fault without immediate harm', () => {
  assert.equal(
    assessIncidentThreat({ ...baseDetails, category: 'infrastructure_fault' }).level,
    'low',
  );
});

test('leaves unclear incidents unknown', () => {
  assert.equal(assessIncidentThreat(baseDetails).level, 'unknown');
});
