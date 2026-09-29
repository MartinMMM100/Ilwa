import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError } from 'zod';

import {
  createOpenAIIncidentExtractor,
  type OpenAIIncidentRequest,
} from '../incidents/openAiExtractor';

const description =
  'Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.';

const details = {
  category: 'robbery' as const,
  locationText: 'near Park Station',
  timeText: 'last night around 9',
  itemsTaken: ['phone'],
  offenderCount: 2,
  weaponReported: 'knife',
  injuriesReported: null,
  isOngoing: null,
};

test('OpenAI extractor requests non-stored structured output and validates the result', async () => {
  let capturedRequest: OpenAIIncidentRequest | undefined;
  const extractIncident = createOpenAIIncidentExtractor({
    model: 'test-incident-model',
    requestIncident: async (request) => {
      capturedRequest = request;
      return details;
    },
  });

  assert.deepEqual(await extractIncident(description), details);
  assert.ok(capturedRequest);
  assert.equal(capturedRequest.model, 'test-incident-model');
  assert.equal(capturedRequest.input, description);
  assert.equal(capturedRequest.store, false);
  assert.match(capturedRequest.instructions, /untrusted source text/i);
  assert.match(capturedRequest.instructions, /Do not invent/i);
});

test('OpenAI extractor rejects output that does not match the incident schema', async () => {
  const extractIncident = createOpenAIIncidentExtractor({
    model: 'test-incident-model',
    requestIncident: async () => ({ category: 'robbery' }),
  });

  await assert.rejects(() => extractIncident(description), ZodError);
});
