import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOpenAITranscriber,
  type OpenAITranscriptionRequest,
} from '../transcription/openAiTranscriber';

test('OpenAI transcriber sends the configured model and returns trimmed text', async () => {
  let capturedRequest: OpenAITranscriptionRequest | undefined;
  const transcribe = createOpenAITranscriber({
    model: 'test-transcription-model',
    requestTranscription: async (request) => {
      capturedRequest = request;
      return '  A resident reported a robbery near the station.  ';
    },
  });
  const audio = {
    bytes: new Uint8Array([1, 2, 3]),
    fileName: 'incident.m4a',
    mediaType: 'audio/mp4',
  };

  assert.equal(await transcribe(audio), 'A resident reported a robbery near the station.');
  assert.ok(capturedRequest);
  assert.equal(capturedRequest.model, 'test-transcription-model');
  assert.equal(capturedRequest.fileName, 'incident.m4a');
  assert.equal(capturedRequest.mediaType, 'audio/mp4');
  assert.deepEqual(capturedRequest.bytes, audio.bytes);
});

test('OpenAI transcriber rejects an empty transcript', async () => {
  const transcribe = createOpenAITranscriber({
    model: 'test-transcription-model',
    requestTranscription: async () => '   ',
  });

  await assert.rejects(
    () =>
      transcribe({
        bytes: new Uint8Array([1]),
        fileName: 'incident.webm',
        mediaType: 'audio/webm',
      }),
    /empty transcript/,
  );
});
