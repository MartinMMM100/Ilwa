import 'dotenv/config';

import { closeMongoClient, getMongoClient } from '../db';
import type { IncidentDocument } from '../incidents/model';
import { MongoIncidentRepository } from '../incidents/mongoRepository';
import { incidentDetailsSchema } from '../incidents/schema';
import { assessIncidentThreat, type ThreatLevel } from '../incidents/threatAssessment';

async function backfillThreatLevels() {
  const mongoUri = requireEnvironmentVariable('MONGODB_URI');
  const databaseName = requireEnvironmentVariable('MONGODB_DB');
  const client = await getMongoClient(mongoUri);
  const collection = client.db(databaseName).collection<IncidentDocument>('incidents');
  const repository = new MongoIncidentRepository(collection);
  const incidents = await collection
    .find(
      { threatLevel: { $exists: false } },
      {
        projection: {
          _id: 1,
          extractionStatus: 1,
          extractedDetails: 1,
        },
      },
    )
    .toArray();

  const counts: Record<ThreatLevel, number> = {
    unknown: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  if (incidents.length > 0) {
    const assessedAt = new Date();
    await collection.bulkWrite(
      incidents.map((incident) => {
        const parsedDetails =
          incident.extractionStatus === 'completed'
            ? incidentDetailsSchema.safeParse(incident.extractedDetails)
            : null;
        const assessment = parsedDetails?.success
          ? assessIncidentThreat(parsedDetails.data)
          : null;
        const threatLevel = assessment?.level ?? 'unknown';
        counts[threatLevel] += 1;

        return {
          updateOne: {
            filter: { _id: incident._id, threatLevel: { $exists: false } },
            update: {
              $set: {
                threatLevel,
                threatAssessmentMethod: assessment?.method ?? null,
                threatAssessedAt: assessment ? assessedAt : null,
              },
            },
          },
        };
      }),
      { ordered: false },
    );
  }

  await repository.ensureIndexes();
  console.log(
    `Threat-level backfill complete: ${incidents.length} assessed ` +
      `(critical ${counts.critical}, high ${counts.high}, medium ${counts.medium}, ` +
      `low ${counts.low}, unknown ${counts.unknown}).`,
  );

  const currentCounts = await collection
    .aggregate<{ _id: ThreatLevel; count: number }>([
      { $group: { _id: '$threatLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  console.log(
    `Current database totals: ${currentCounts
      .map(({ _id, count }) => `${_id} ${count}`)
      .join(', ')}.`,
  );
}

function requireEnvironmentVariable(name: 'MONGODB_URI' | 'MONGODB_DB') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

backfillThreatLevels()
  .catch((error: unknown) => {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`Threat-level backfill failed (${errorName}).`);
    process.exitCode = 1;
  })
  .finally(closeMongoClient);
