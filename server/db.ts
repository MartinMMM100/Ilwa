import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let connectedClient: Promise<MongoClient> | null = null;
let configuredUri: string | null = null;

export function getMongoClient(uri: string) {
  if (configuredUri && configuredUri !== uri) {
    throw new Error('The shared MongoDB client cannot be reconfigured at runtime.');
  }

  configuredUri = uri;
  client ??= new MongoClient(uri, { appName: 'ilwa-incident-api' });
  connectedClient ??= client.connect();
  return connectedClient;
}

export async function closeMongoClient() {
  if (client) {
    await client.close();
  }
  client = null;
  connectedClient = null;
  configuredUri = null;
}
