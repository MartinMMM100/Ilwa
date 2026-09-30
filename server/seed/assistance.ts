import 'dotenv/config';

import { findNearestThirdParty, resolveAssistanceContacts } from '../assistance/contacts';
import type {
  AssistanceRequestDocument,
  HelpResponse,
} from '../assistance/model';
import { MongoAssistanceRequestRepository } from '../assistance/mongoRepository';
import { closeMongoClient, getMongoClient } from '../db';
import { suburbs, type AreaId } from '../../shared/safetyMap';

type DemoCallScenario = {
  areaId: AreaId;
  answered: boolean;
  helpResponse: HelpResponse;
  reportNumber: number;
  useFallback: boolean;
  minutesAgo: number;
};

const scenarios: DemoCallScenario[] = [
  {
    areaId: 'braamfontein',
    answered: true,
    helpResponse: 'coming',
    reportNumber: 1,
    useFallback: false,
    minutesAgo: 35,
  },
  {
    areaId: 'parktown',
    answered: false,
    helpResponse: 'not_coming',
    reportNumber: 2,
    useFallback: true,
    minutesAgo: 95,
  },
  {
    areaId: 'newtown',
    answered: true,
    helpResponse: 'not_coming',
    reportNumber: 3,
    useFallback: true,
    minutesAgo: 180,
  },
  {
    areaId: 'johannesburg-cbd',
    answered: false,
    helpResponse: 'not_coming',
    reportNumber: 4,
    useFallback: true,
    minutesAgo: 310,
  },
  {
    areaId: 'melville',
    answered: true,
    helpResponse: 'unsure',
    reportNumber: 5,
    useFallback: true,
    minutesAgo: 540,
  },
  {
    areaId: 'hillbrow',
    answered: true,
    helpResponse: 'coming',
    reportNumber: 6,
    useFallback: false,
    minutesAgo: 780,
  },
];

async function seedAssistanceCalls() {
  const mongoUri = requireEnvironmentVariable('MONGODB_URI');
  const databaseName = requireEnvironmentVariable('MONGODB_DB');
  const contacts = resolveAssistanceContacts(process.env);
  if (!contacts.demoMode || !contacts.primary || contacts.thirdParties.length < 3) {
    throw new Error(
      'Demo assistance seeding requires ASSISTANCE_DEMO_MODE=true, a primary contact, and three private responders.',
    );
  }

  const client = await getMongoClient(mongoUri);
  const collection = client
    .db(databaseName)
    .collection<AssistanceRequestDocument>('assistanceRequests');
  await new MongoAssistanceRequestRepository(collection).ensureIndexes();

  const baseTime = new Date();
  let created = 0;
  let updated = 0;

  for (const scenario of scenarios) {
    const area = suburbs.find((candidate) => candidate.id === scenario.areaId);
    if (!area) continue;

    const sequence = String(scenario.reportNumber).padStart(3, '0');
    const createdAt = new Date(baseTime.getTime() - scenario.minutesAgo * 60_000);
    const confirmedAt = new Date(createdAt.getTime() + 4 * 60_000);
    const fallback = scenario.useFallback
      ? findNearestThirdParty(contacts.thirdParties, area)
      : null;
    if (scenario.useFallback && !fallback) {
      throw new Error(`No demo private responder is available for ${area.name}.`);
    }

    const document: AssistanceRequestDocument = {
      requestId: `demo-assistance-${sequence}`,
      reportingSessionId: `demo-assistance-session-${sequence}`,
      reportReference: `ILWA-DEMO-${sequence}`,
      reporterId: `development-seed-resident-${String((scenario.reportNumber % 12) + 1).padStart(2, '0')}`,
      isDemoData: true,
      areaId: scenario.areaId,
      status: fallback ? 'third_party_call_started' : 'primary_outcome_recorded',
      primaryCall: {
        contactId: contacts.primary.id,
        name: contacts.primary.name,
        phoneNumber: contacts.primary.phoneNumber,
        initiatedAt: createdAt,
        answered: scenario.answered,
        helpResponse: scenario.helpResponse,
        confirmedAt,
      },
      thirdPartyCall: fallback
        ? {
            contactId: fallback.contact.id,
            name: fallback.contact.name,
            phoneNumber: fallback.contact.phoneNumber,
            distanceMeters: fallback.distanceMeters,
            initiatedAt: new Date(confirmedAt.getTime() + 2 * 60_000),
          }
        : null,
      createdAt,
      updatedAt: fallback
        ? new Date(confirmedAt.getTime() + 2 * 60_000)
        : confirmedAt,
    };

    const result = await collection.replaceOne(
      { requestId: document.requestId },
      document,
      { upsert: true },
    );
    if (result.upsertedCount === 1) created += 1;
    else updated += 1;
  }

  console.log(`Demo assistance seed complete: ${created} created, ${updated} refreshed.`);
}

function requireEnvironmentVariable(name: 'MONGODB_URI' | 'MONGODB_DB') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

seedAssistanceCalls()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Demo assistance seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
