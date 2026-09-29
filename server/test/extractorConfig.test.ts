import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveIncidentExtractor } from '../incidents/extractorConfig';

test('incident extractor defaults to the deterministic mock explicitly', () => {
  const configuration = resolveIncidentExtractor({});

  assert.equal(configuration.extractionMethod, 'mock-v1');
  assert.equal(configuration.extractionModel, null);
  assert.equal(typeof configuration.fixtureMatcher, 'function');
});

test('OpenAI mode requires a server-side API key and never silently falls back', () => {
  assert.throws(
    () => resolveIncidentExtractor({ INCIDENT_EXTRACTOR: 'openai' }),
    /OPENAI_API_KEY is required/,
  );

  const configuration = resolveIncidentExtractor({
    INCIDENT_EXTRACTOR: 'openai',
    OPENAI_API_KEY: 'test-only-key',
    OPENAI_INCIDENT_MODEL: 'test-incident-model',
  });
  assert.equal(configuration.extractionMethod, 'openai-responses-v1');
  assert.equal(configuration.extractionModel, 'test-incident-model');
  assert.equal(configuration.fixtureMatcher, undefined);
});

test('unknown incident extractor modes are rejected', () => {
  assert.throws(
    () => resolveIncidentExtractor({ INCIDENT_EXTRACTOR: 'automatic' }),
    /must be either "mock" or "openai"/,
  );
});
