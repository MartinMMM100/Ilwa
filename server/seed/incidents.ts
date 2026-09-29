import 'dotenv/config';

import { closeMongoClient, getMongoClient } from '../db';
import type { IncidentDocument } from '../incidents/model';
import { MongoIncidentRepository } from '../incidents/mongoRepository';
import type { IncidentDetails } from '../incidents/schema';
import { submitIncident } from '../incidents/service';

type SeedScenario = Omit<IncidentDetails, 'locationText' | 'timeText'> & {
  sentence: (locationText: string, timeText: string) => string;
};

const locations = [
  'near Park Station',
  'on Juta Street',
  'near De Korte Street',
  'outside Braamfontein Library',
  'near the Wits University entrance',
  'on Smit Street',
  'near Civic Boulevard',
  'near Constitution Hill',
];

const times = [
  'this morning around 7',
  'yesterday afternoon',
  'last night around 9',
  'two days ago around lunchtime',
];

const scenarios: SeedScenario[] = [
  {
    category: 'robbery',
    sentence: (location, time) =>
      `Two people robbed a commuter ${location} ${time}. They took a phone and one displayed a knife.`,
    itemsTaken: ['phone'],
    offenderCount: 2,
    weaponReported: 'knife',
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'theft',
    sentence: (location, time) =>
      `A backpack was stolen from a parked car ${location} ${time}. No offender description was available.`,
    itemsTaken: ['backpack'],
    offenderCount: null,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'assault',
    sentence: (location, time) =>
      `One person reported being assaulted ${location} ${time}. No injury or weapon information was provided.`,
    itemsTaken: [],
    offenderCount: 1,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'vehicle_theft',
    sentence: (location, time) =>
      `A motorcycle was reported stolen ${location} ${time}. The offender count was unknown.`,
    itemsTaken: ['motorcycle'],
    offenderCount: null,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'suspicious_activity',
    sentence: (location, time) =>
      `Two people were seen checking parked car doors ${location} ${time}. It was unclear whether they were still there.`,
    itemsTaken: [],
    offenderCount: 2,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'infrastructure_fault',
    sentence: (location, time) =>
      `A broken streetlight was reported ${location} ${time}. The surrounding pavement was poorly lit.`,
    itemsTaken: [],
    offenderCount: null,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'vandalism',
    sentence: (location, time) =>
      `Three people damaged a bus shelter ${location} ${time}. No weapon or injury was reported.`,
    itemsTaken: [],
    offenderCount: 3,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
  {
    category: 'other_unclear',
    sentence: (location, time) =>
      `A resident reported an unclear disturbance ${location} ${time}. No further details were available.`,
    itemsTaken: [],
    offenderCount: null,
    weaponReported: null,
    injuriesReported: null,
    isOngoing: null,
  },
];

async function seedIncidents() {
  const mongoUri = requireEnvironmentVariable('MONGODB_URI');
  const databaseName = requireEnvironmentVariable('MONGODB_DB');
  const client = await getMongoClient(mongoUri);
  const collection = client.db(databaseName).collection<IncidentDocument>('incidents');
  const repository = new MongoIncidentRepository(collection);
  const baseTime = new Date();
  let created = 0;
  let existing = 0;

  await repository.ensureIndexes();
  await collection.updateOne(
    { submissionId: 'seed-park-station-robbery-001' },
    { $set: { isDemoData: true } },
  );

  for (let locationIndex = 0; locationIndex < locations.length; locationIndex += 1) {
    const locationText = locations[locationIndex];
    if (!locationText) {
      continue;
    }

    for (let offset = 0; offset < 4; offset += 1) {
      const seedNumber = locationIndex * 4 + offset + 1;
      const scenario = scenarios[(locationIndex + offset) % scenarios.length];
      const timeText = times[(locationIndex + offset * 2) % times.length];
      if (!scenario || !timeText) {
        continue;
      }

      const description = `[DEMO DATA] ${scenario.sentence(locationText, timeText)}`;
      const reportedAt = new Date(baseTime.getTime() - seedNumber * 18 * 60 * 60 * 1_000);
      const details: IncidentDetails = {
        category: scenario.category,
        locationText,
        timeText,
        itemsTaken: [...scenario.itemsTaken],
        offenderCount: scenario.offenderCount,
        weaponReported: scenario.weaponReported,
        injuriesReported: scenario.injuriesReported,
        isOngoing: scenario.isOngoing,
      };

      const result = await submitIncident(
        {
          reporterId: `development-seed-resident-${String((seedNumber % 12) + 1).padStart(2, '0')}`,
          description,
          submissionId: `seed-demo-v1-${String(seedNumber).padStart(3, '0')}`,
          isDemoData: true,
        },
        {
          repository,
          extractor: async () => details,
          fixtureMatcher: () => true,
          clock: () => new Date(reportedAt),
          referenceFactory: () => `ILWA-DEMO-${String(seedNumber).padStart(3, '0')}`,
        },
      );

      if (result.duplicate) {
        existing += 1;
      } else {
        created += 1;
      }
    }
  }

  console.log(`Demo incident seed complete: ${created} created, ${existing} already present.`);
}

function requireEnvironmentVariable(name: 'MONGODB_URI' | 'MONGODB_DB') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

seedIncidents()
  .catch((error: unknown) => {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Demo incident seed failed (${errorName}).`);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
