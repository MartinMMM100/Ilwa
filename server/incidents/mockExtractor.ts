import type { IncidentDetails } from './schema';

type Fixture = {
  description: string;
  details: IncidentDetails;
};

// MOCK ONLY: replace extractIncident with a real AI-backed implementation later.
const mockFixtures: Fixture[] = [
  {
    description:
      'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.',
    details: {
      category: 'robbery',
      locationText: 'near Park Station',
      timeText: 'last night around 9',
      itemsTaken: ['phone'],
      offenderCount: 2,
      weaponReported: 'knife',
      injuriesReported: null,
      isOngoing: null,
    },
  },
  {
    description:
      'Someone broke into my parked car on Juta Street this morning and stole a backpack.',
    details: {
      category: 'theft',
      locationText: 'on Juta Street',
      timeText: 'this morning',
      itemsTaken: ['backpack'],
      offenderCount: null,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: null,
    },
  },
  {
    description: 'Three people are damaging a streetlight outside the library right now.',
    details: {
      category: 'vandalism',
      locationText: 'outside the library',
      timeText: 'right now',
      itemsTaken: [],
      offenderCount: 3,
      weaponReported: null,
      injuriesReported: null,
      isOngoing: true,
    },
  },
];

const unmatchedDetails: IncidentDetails = {
  category: 'other_unclear',
  locationText: null,
  timeText: null,
  itemsTaken: [],
  offenderCount: null,
  weaponReported: null,
  injuriesReported: null,
  isOngoing: null,
};

function normalizeFixtureText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function findFixture(description: string) {
  const normalizedDescription = normalizeFixtureText(description);
  return mockFixtures.find(
    (fixture) => normalizeFixtureText(fixture.description) === normalizedDescription,
  );
}

export function didMatchMockFixture(description: string) {
  return findFixture(description) !== undefined;
}

/**
 * Deterministic mock extraction boundary. The return shape is intentionally the
 * same shape expected from the future real AI service.
 */
export async function extractIncident(description: string): Promise<IncidentDetails> {
  const fixture = findFixture(description);
  const details = fixture?.details ?? unmatchedDetails;

  return {
    ...details,
    itemsTaken: [...details.itemsTaken],
  };
}
