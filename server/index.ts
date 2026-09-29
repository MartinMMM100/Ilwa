import 'dotenv/config';

import { createServer } from 'node:http';

import { createApp } from './app';
import { closeMongoClient, getMongoClient } from './db';
import { MongoIncidentRepository } from './incidents/mongoRepository';
import type { IncidentDocument } from './incidents/model';

async function start() {
  const mongoUri = requireEnvironmentVariable('MONGODB_URI');
  const databaseName = requireEnvironmentVariable('MONGODB_DB');
  const port = parsePort(process.env.PORT);
  const mongoClient = await getMongoClient(mongoUri);
  const incidents = mongoClient.db(databaseName).collection<IncidentDocument>('incidents');
  const repository = new MongoIncidentRepository(incidents);

  await repository.ensureIndexes();

  const server = createServer(createApp({ repository }));
  server.listen(port, () => {
    console.log(`ILWA incident API listening on port ${port}.`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeMongoClient();
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function requireEnvironmentVariable(name: 'MONGODB_URI' | 'MONGODB_DB') {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

start().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  console.error(`ILWA incident API failed to start (${errorName}).`);
  process.exitCode = 1;
});
