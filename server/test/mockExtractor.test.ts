import assert from 'node:assert/strict';
import test from 'node:test';

import { didMatchMockFixture, extractIncident } from '../incidents/mockExtractor';

const robberyFixture =
  'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.';

test('mock extractor returns the required robbery fixture after case and whitespace normalization', async () => {
  const description = `  TWO guys robbed me near Park Station last night around 9.\nThey took my phone and one had a knife.  `;

  assert.equal(didMatchMockFixture(description), true);
  assert.deepEqual(await extractIncident(description), {
    category: 'robbery',
    locationText: 'near Park Station',
    timeText: 'last night around 9',
    itemsTaken: ['phone'],
    offenderCount: 2,
    weaponReported: 'knife',
    injuriesReported: null,
    isOngoing: null,
  });
});

test('mock extractor includes two additional deterministic fictional fixtures', async () => {
  assert.equal(didMatchMockFixture(robberyFixture), true);
  assert.deepEqual(
    await extractIncident(
      'Someone broke into my parked car on Juta Street this morning and stole a backpack.',
    ),
    {
      category: 'theft',
      locationText: 'on Juta Street',
      timeText: 'this morning',
      itemsTaken: ['backpack'],
      offenderCount: null,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: null,
    },
  );
  assert.deepEqual(
    await extractIncident('Three people are damaging a streetlight outside the library right now.'),
    {
      category: 'vandalism',
      locationText: 'outside the library',
      timeText: 'right now',
      itemsTaken: [],
      offenderCount: 3,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: true,
    },
  );
});

test('mock extractor returns only unknown fields for unmatched text', async () => {
  const description = 'A fictional incident that does not match any configured fixture.';

  assert.equal(didMatchMockFixture(description), false);
  assert.deepEqual(await extractIncident(description), {
    category: 'other_unclear',
    locationText: null,
    timeText: null,
    itemsTaken: [],
    offenderCount: null,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  });
});
