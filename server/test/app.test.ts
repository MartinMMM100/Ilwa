import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';

import { createApp } from '../app';
import type { IncidentPhoto, IncidentPhotoStore } from '../incidents/photoStore';
import { TestIncidentRepository } from './testRepository';

test('POST /api/incidents rejects invalid input without writing a report', async () => {
  const repository = new TestIncidentRepository();
  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'short', submissionId: 'valid-id-123' }),
    });

    assert.equal(response.status, 400);
    assert.equal(repository.documents.size, 0);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'INVALID_INCIDENT');
  });
});

test('POST /api/incidents derives reporter identity from middleware, never the body', async () => {
  const repository = new TestIncidentRepository();
  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });
  const description =
    'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.';

  await withServer(app.listen(0), async (baseUrl) => {
    const bodyIdentityResponse = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        submissionId: 'body-identity-1',
        reporterId: 'body-supplied-identity',
      }),
    });
    assert.equal(bodyIdentityResponse.status, 400);
    assert.equal(repository.documents.size, 0);

    const response = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, submissionId: 'middleware-identity-1' }),
    });
    const responseBody = (await response.json()) as { report: { reference: string } };

    assert.equal(response.status, 201);
    assert.match(responseBody.report.reference, /^ILWA-/);
    assert.equal(
      repository.documents.get('middleware-identity-1')?.reporterId,
      'development-only-test-resident',
    );
  });
});

test('development-only identity cannot be enabled in production', () => {
  assert.throws(
    () =>
      createApp({
        repository: new TestIncidentRepository(),
        environment: { NODE_ENV: 'production', DEV_REPORTER_ID: 'development-only-resident' },
      }),
    /disabled in production/,
  );
});

test('POST /api/transcriptions returns an editable transcript without storing audio', async () => {
  const repository = new TestIncidentRepository();
  let receivedFileName: string | undefined;
  let receivedMediaType: string | undefined;
  let receivedByteLength: number | undefined;
  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
    transcriber: async (audio) => {
      receivedFileName = audio.fileName;
      receivedMediaType = audio.mediaType;
      receivedByteLength = audio.bytes.byteLength;
      return 'A resident reported a robbery near the station.';
    },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mp4' }), 'incident.m4a');
    const response = await fetch(`${baseUrl}/api/transcriptions`, {
      method: 'POST',
      body: form,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      transcript: 'A resident reported a robbery near the station.',
    });
    assert.equal(receivedFileName, 'incident.m4a');
    assert.equal(receivedMediaType, 'audio/mp4');
    assert.equal(receivedByteLength, 3);
    assert.equal(repository.documents.size, 0);
  });
});

test('POST /api/transcriptions rejects missing and unsupported audio', async () => {
  const app = createApp({
    repository: new TestIncidentRepository(),
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
    transcriber: async () => 'Transcript should not be reached.',
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const missingResponse = await fetch(`${baseUrl}/api/transcriptions`, {
      method: 'POST',
      body: new FormData(),
    });
    assert.equal(missingResponse.status, 400);
    assert.equal(
      ((await missingResponse.json()) as { error: { code: string } }).error.code,
      'AUDIO_REQUIRED',
    );

    const unsupportedForm = new FormData();
    unsupportedForm.append('audio', new Blob(['not audio'], { type: 'text/plain' }), 'report.txt');
    const unsupportedResponse = await fetch(`${baseUrl}/api/transcriptions`, {
      method: 'POST',
      body: unsupportedForm,
    });
    assert.equal(unsupportedResponse.status, 400);
    assert.equal(
      ((await unsupportedResponse.json()) as { error: { code: string } }).error.code,
      'UNSUPPORTED_AUDIO_TYPE',
    );
  });
});

test('POST /api/transcriptions reports provider failure without creating an incident', async () => {
  const repository = new TestIncidentRepository();
  const app = createApp({
    repository,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
    transcriber: async () => {
      throw new Error('Synthetic transcription failure');
    },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array([1])], { type: 'audio/webm' }), 'incident.webm');
    const response = await fetch(`${baseUrl}/api/transcriptions`, {
      method: 'POST',
      body: form,
    });

    assert.equal(response.status, 502);
    assert.equal(
      ((await response.json()) as { error: { code: string } }).error.code,
      'TRANSCRIPTION_FAILED',
    );
    assert.equal(repository.documents.size, 0);
  });
});

test('incident photos are stored and served through the public feed', async () => {
  const repository = new TestIncidentRepository();
  const photoStore = new TestIncidentPhotoStore();
  const app = createApp({
    repository,
    photoStore,
    environment: { NODE_ENV: 'test', DEV_REPORTER_ID: 'development-only-test-resident' },
  });

  await withServer(app.listen(0), async (baseUrl) => {
    const incidentResponse = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description:
          'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.',
        submissionId: 'photo-upload-submission-1',
      }),
    });
    assert.equal(incidentResponse.status, 201);
    const incidentBody = (await incidentResponse.json()) as { report: { reference: string } };

    const form = new FormData();
    form.append(
      'photo',
      new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
      'incident.jpg',
    );
    const uploadResponse = await fetch(
      `${baseUrl}/api/incidents/${incidentBody.report.reference}/photo`,
      { method: 'POST', body: form },
    );
    assert.equal(uploadResponse.status, 201);

    const savedIncident = await repository.findByReportReference(incidentBody.report.reference);
    assert.equal(savedIncident?.photo?.mediaType, 'image/jpeg');
    assert.equal(savedIncident?.photo?.byteLength, 4);

    const feedResponse = await fetch(`${baseUrl}/api/feed`);
    const feedBody = (await feedResponse.json()) as {
      items: { id: string; photoUrl: string | null }[];
    };
    assert.equal(
      feedBody.items.find((item) => item.id === incidentBody.report.reference)?.photoUrl,
      `/api/feed/${incidentBody.report.reference}/photo`,
    );

    const photoResponse = await fetch(
      `${baseUrl}/api/feed/${incidentBody.report.reference}/photo`,
    );
    assert.equal(photoResponse.status, 200);
    assert.equal(photoResponse.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(new Uint8Array(await photoResponse.arrayBuffer()), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
  });
});

class TestIncidentPhotoStore implements IncidentPhotoStore {
  private readonly photos = new Map<string, IncidentPhoto>();

  async save(reportReference: string, photo: IncidentPhoto) {
    this.photos.set(reportReference, { ...photo, bytes: Buffer.from(photo.bytes) });
  }

  async find(reportReference: string) {
    const photo = this.photos.get(reportReference);
    return photo ? { ...photo, bytes: Buffer.from(photo.bytes) } : null;
  }

  async delete(reportReference: string) {
    this.photos.delete(reportReference);
  }
}

async function withServer(server: Server, callback: (baseUrl: string) => Promise<void>) {
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server did not expose a TCP port.');
  }

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
